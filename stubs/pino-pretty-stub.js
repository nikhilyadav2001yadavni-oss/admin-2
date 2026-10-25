/**
 * pino tries to resolve pino-pretty for optional pretty-printing (Node CLI).
 * WalletConnect pulls pino into the browser bundle; this stub avoids the missing optional dep.
 */
module.exports = function pinoPrettyStub() {}
