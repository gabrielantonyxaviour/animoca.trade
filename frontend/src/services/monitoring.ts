/**
 * Monitoring and Analytics Service
 * Handles error tracking, performance monitoring, and user analytics
 */

// import * as Sentry from '@sentry/react';
// import { BrowserTracing } from '@sentry/tracing';

// Google Analytics
declare global {
  interface Window {
    gtag: (command: string, ...args: any[]) => void;
    dataLayer: any[];
  }
}

/**
 * Initialize all monitoring services
 */
export function initializeMonitoring() {
  // Initialize Sentry for error tracking
  // Commented out until Sentry packages are installed
  /*
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        // Filter out known non-issues
        if (event.exception?.values?.[0]?.type === 'NetworkError') {
          return null;
        }
        return event;
      },
    });
  }
  */

  // Initialize Google Analytics
  if (process.env.REACT_APP_GA_TRACKING_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.REACT_APP_GA_TRACKING_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', process.env.REACT_APP_GA_TRACKING_ID);
  }

  // Track page performance
  trackPagePerformance();

  // Set up custom error boundary
  setupErrorBoundary();
}

/**
 * Track custom events
 */
export function trackEvent(category: string, action: string, label?: string, value?: number) {
  // Send to Google Analytics
  if (window.gtag && process.env.REACT_APP_GA_TRACKING_ID) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }

  // Send to Sentry as breadcrumb
  // Sentry.addBreadcrumb({
  //   category: 'user-action',
  //   message: `${category}: ${action}`,
  //   level: 'info',
  //   data: { label, value },
  // });
}

/**
 * Track wallet events
 */
export function trackWalletEvent(action: string, wallet?: string) {
  trackEvent('Wallet', action, wallet);

  // Set user context in Sentry
  // if (address) {
  //   Sentry.setUser({ id: address });
  // }
}

/**
 * Track transaction events
 */
export function trackTransaction(
  type: string,
  tokenAddress?: string
) {
  trackEvent('Transaction', type, tokenAddress);

  // Add transaction context to Sentry
  // Sentry.setContext('transaction', {
  //   type,
  //   tokenAddress,
  //   amount,
  //   txHash,
  // });
}

/**
 * Track contract interactions
 */
export function trackContractInteraction(
  contract: string,
  method: string,
  success: boolean
) {
  const eventAction = success ? `${method}_success` : `${method}_failure`;
  trackEvent('Contract', eventAction, contract);

  // Log to Sentry for debugging
  // Sentry.addBreadcrumb({
  //   category: 'contract',
  //   message: `${contract}.${method}`,
  //   level: success ? 'info' : 'warning',
  //   data: { gasUsed },
  // });
}

/**
 * Track page performance metrics
 */
function trackPagePerformance() {
  // Track Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        trackEvent('Performance', 'LCP', undefined, lastEntry.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          trackEvent('Performance', 'FID', undefined, entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Report CLS when page is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          trackEvent('Performance', 'CLS', undefined, clsValue);
        }
      });
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  // Track page load time
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      trackEvent('Performance', 'PageLoad', undefined, perfData.loadEventEnd - perfData.fetchStart);
      trackEvent('Performance', 'DOMReady', undefined, perfData.domContentLoadedEventEnd - perfData.fetchStart);
      trackEvent('Performance', 'TimeToFirstByte', undefined, perfData.responseStart - perfData.fetchStart);
    }
  });
}

/**
 * Set up custom error boundary for React
 */
function setupErrorBoundary() {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Sentry.captureException(new Error(event.reason));
    trackEvent('Error', 'UnhandledRejection', event.reason?.message);
  });

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Sentry.captureException(event.error);
    trackEvent('Error', 'GlobalError', event.error?.message);
  });
}

/**
 * Track API performance
 */
export function trackAPICall(endpoint: string, duration: number, success: boolean) {
  trackEvent('API', success ? 'Success' : 'Failure', endpoint, duration);

  // Alert if API is slow
  if (duration > 3000) {
    // Sentry.captureMessage(`Slow API call: ${endpoint} took ${duration}ms`, 'warning');
  }
}

/**
 * Monitor WebSocket connections
 */
export class WebSocketMonitor {
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  onConnect() {
    this.reconnectAttempts = 0;
    trackEvent('WebSocket', 'Connected', this.url);
  }

  onDisconnect(reason?: string) {
    trackEvent('WebSocket', 'Disconnected', this.url);
    if (reason) {
      // Sentry.addBreadcrumb({
      //   category: 'websocket',
      //   message: `Disconnected: ${reason}`,
      //   level: 'warning',
      // });
    }
  }

  onError() {
    trackEvent('WebSocket', 'Error', this.url);
    // Sentry.captureException(error);
  }

  onReconnectAttempt() {
    this.reconnectAttempts++;
    trackEvent('WebSocket', 'ReconnectAttempt', this.url, this.reconnectAttempts);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Sentry.captureMessage(
      //   `WebSocket failed to reconnect after ${this.maxReconnectAttempts} attempts`,
      //   'error'
      // );
    }
  }
}

/**
 * Monitor contract events
 */
export class ContractEventMonitor {
  private eventCounts: Map<string, number> = new Map();

  trackEvent(eventName: string, contractAddress: string) {
    const key = `${contractAddress}:${eventName}`;
    const count = (this.eventCounts.get(key) || 0) + 1;
    this.eventCounts.set(key, count);

    trackEvent('ContractEvent', eventName, contractAddress);

    // Log significant events to Sentry
    if (eventName === 'TokenCreated' || eventName === 'PoolCreated') {
      // Sentry.addBreadcrumb({
      //   category: 'contract-event',
      //   message: eventName,
      //   level: 'info',
      //   data: { contractAddress, ...data },
      // });
    }
  }

  getEventCount(eventName: string, contractAddress: string): number {
    return this.eventCounts.get(`${contractAddress}:${eventName}`) || 0;
  }
}

/**
 * Performance optimization utilities
 */
export const PerformanceOptimizer = {
  // Debounce function calls
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Measure function execution time
  measureExecutionTime<T extends (...args: any[]) => any>(
    func: T,
    name: string
  ): T {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = func(...args);
      const duration = performance.now() - start;

      if (duration > 100) {
        console.warn(`${name} took ${duration}ms`);
        trackEvent('Performance', 'SlowFunction', name, duration);
      }

      return result;
    }) as T;
  },

  // Cache expensive computations
  memoize<T extends (...args: any[]) => any>(func: T): T {
    const cache = new Map<string, ReturnType<T>>();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
};

/**
 * Export monitoring instance
 */
export const monitoring = {
  init: initializeMonitoring,
  trackEvent,
  trackWalletEvent,
  trackTransaction,
  trackContractInteraction,
  trackAPICall,
  WebSocketMonitor,
  ContractEventMonitor,
  PerformanceOptimizer,
};