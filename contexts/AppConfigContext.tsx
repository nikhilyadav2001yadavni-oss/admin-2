"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { systemConfigAPI } from "@/lib/api";

interface SystemConfig {
    _id: string;
    platformName: string;
    logo?: string | null;
    darkMode: boolean;
    pushNotification: boolean;
    twoFA: boolean;
    biometricLogin: boolean;
    maintenance: boolean;
    maintenanceMessage?: string | null;
    supportEmail: string;
    websiteDomain?: string | null;
}

interface AppConfigContextType {
    config: SystemConfig | null;
    loading: boolean;
    error: string | null;
    refreshConfig: () => void;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
    undefined
);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = () => {
        setLoading(true);
        setError(null);

        systemConfigAPI
            .get()
            .then((res) => {
                const data = res.data?.data;
                if (data) {
                    setConfig(data);
                }
            })
            .catch((err) => {
                setError(
                    err.response?.data?.message ||
                        "Failed to load configuration"
                );
                console.error("Failed to load app configuration:", err);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        // Only fetch config if user is authenticated
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        if (token) {
            fetchConfig();
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <AppConfigContext.Provider
            value={{
                config,
                loading,
                error,
                refreshConfig: fetchConfig,
            }}
        >
            {children}
        </AppConfigContext.Provider>
    );
}

export function useAppConfig() {
    const context = useContext(AppConfigContext);
    if (context === undefined) {
        throw new Error("useAppConfig must be used within AppConfigProvider");
    }
    return context;
}
