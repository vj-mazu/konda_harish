/**
 * Performance Configuration for 10 Lakh Records
 * 
 * Optimized settings for handling large datasets with sub-1-second response times
 */

module.exports = {
  // Database Configuration
  database: {
    // Connection Pool Settings
    pool: {
      max: 50,           // Maximum connections
      min: 10,           // Minimum connections
      acquire: 60000,     // 60s acquire timeout
      idle: 10000,       // 10s idle timeout
      evict: 1000,       // 1s eviction interval
      maxUses: 2000       // Max uses per connection
    },
    
    // Query Timeouts (in milliseconds)
    timeouts: {
      statement: 30000,  // 30s database timeout
      query: 25000,      // 25s Sequelize timeout
      transaction: 60000  // 60s transaction timeout
    }
  },

  // Cache Configuration
  cache: {
    // In-memory cache settings
    memory: {
      maxItems: 10000,
      defaultTTL: 300,   // 5 minutes
      enable: true
    },
    
    // Redis settings (optional)
    redis: {
      enable: !!process.env.REDIS_URL,
      url: process.env.REDIS_URL || null,
      ttl: 600,          // 10 minutes for Redis
      keyPrefix: 'mother_india:'
    }
  },

  // API Response Settings
  api: {
    // Pagination limits
    pagination: {
      default: 50,
      max: 10000,
      recommended: 250
    },
    
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 10000                    // 10,000 requests
    },
    
    // Timeout settings
    timeout: 30000  // 30s request timeout
  },

  // Query Optimization
  query: {
    // Enable query result caching
    cacheEnabled: true,
    
    // Slow query threshold (ms)
    slowQueryThreshold: 1000,
    
    // Enable query result transformation
    transform: true,
    
    // Maximum join depth
    maxJoinDepth: 3
  },

  // Compression Settings
  compression: {
    level: 6,        // Good balance of speed/size
    threshold: 1024,  // Only compress >1KB
    enable: true
  },

  // Performance Monitoring
  monitoring: {
    // Enable performance tracking
    enabled: true,
    
    // Log slow queries
    logSlowQueries: true,
    
    // Slow query threshold
    slowQueryMs: 1000,
    
    // Track cache hit rate
    trackCacheHitRate: true,
    
    // Performance metrics retention (hours)
    metricsRetention: 24
  },

  // Index Hints for Common Queries
  indexHints: {
    // Common filter combinations
    commonFilters: [
      'status + date',
      'movementType + status + date',
      'variety + status',
      'toKunchinintuId + date',
      'fromKunchinintuId + date',
      'locationCode + date',
      'productType + locationCode + date'
    ]
  }
};
