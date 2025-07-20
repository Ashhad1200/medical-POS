import { DEBUG_CONFIG } from '../config/constants';

/**
 * Centralized logging utility with environment-based control
 * Replaces scattered console.log statements throughout the application
 */
class Logger {
  constructor() {
    this.isEnabled = DEBUG_CONFIG.ENABLE_CONSOLE_LOGS;
  }

  /**
   * Log info messages (development only)
   */
  info(message, ...args) {
    if (this.isEnabled) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log debug messages (development only)
   */
  debug(message, ...args) {
    if (this.isEnabled) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages (always shown)
   */
  warn(message, ...args) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Log error messages (always shown)
   */
  error(message, ...args) {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * Log authentication-related messages
   */
  auth(message, ...args) {
    if (this.isEnabled) {
      console.log(`[AUTH] ${message}`, ...args);
    }
  }

  /**
   * Log API-related messages
   */
  api(message, ...args) {
    if (this.isEnabled) {
      console.log(`[API] ${message}`, ...args);
    }
  }

  /**
   * Log query-related messages (React Query)
   */
  query(message, ...args) {
    if (this.isEnabled) {
      console.log(`[QUERY] ${message}`, ...args);
    }
  }

  /**
   * Log component lifecycle messages
   */
  component(componentName, message, ...args) {
    if (this.isEnabled) {
      console.log(`[${componentName}] ${message}`, ...args);
    }
  }

  /**
   * Log performance-related messages
   */
  performance(message, ...args) {
    if (this.isEnabled) {
      console.log(`[PERF] ${message}`, ...args);
    }
  }

  /**
   * Create a scoped logger for a specific module
   */
  scope(scopeName) {
    return {
      info: (message, ...args) => this.info(`[${scopeName}] ${message}`, ...args),
      debug: (message, ...args) => this.debug(`[${scopeName}] ${message}`, ...args),
      warn: (message, ...args) => this.warn(`[${scopeName}] ${message}`, ...args),
      error: (message, ...args) => this.error(`[${scopeName}] ${message}`, ...args),
    };
  }

  /**
   * Enable/disable logging at runtime
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  auth: logger.auth.bind(logger),
  api: logger.api.bind(logger),
  query: logger.query.bind(logger),
  component: logger.component.bind(logger),
  performance: logger.performance.bind(logger),
  scope: logger.scope.bind(logger),
};

export default logger;