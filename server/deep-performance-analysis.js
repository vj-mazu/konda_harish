/**
 * Deep Performance Analysis Tool
 * 
 * This script performs a comprehensive analysis of database performance:
 * 1. Checks actual query execution plans (EXPLAIN ANALYZE)
 * 2. Identifies slow queries and missing indexes
 * 3. Analyzes table statistics and index usage
 * 4. Provides specific recommendations
 */

const { sequelize } = require('./config/database');

async function deepAnalysis() {
  try {
    console.log('🔍 DEEP PERFORMANCE ANALYSIS');
    console.log('='.repeat(80));
    console.log('\n');

    // ============================================================================
    // 1. CHECK SLOW QUERY PATTERNS
    // ============================================================================
    console.log('📊 SECTION 1: Analyzing Slow Query Patterns');
    console.log('-'.repeat(80));

    // Simulate the actual queries that are slow
    const slowQueries = [
      {
        name: '/api/arrivals/pending-list',
        query: `
          SELECT * FROM "Arrivals" 
          WHERE status = 'pending' 
          ORDER BY date DESC, "createdAt" DESC 
          LIMIT 100
        `
      },
      {
        name: '/api/records/arrivals (with date filter)',
        query: `
          SELECT * FROM "Arrivals" 
          WHERE date >= '2026-01-01' AND date <= '2026-02-01'
          AND status IN ('approved', 'admin-approved')
          ORDER BY date DESC
          LIMIT 250
        `
      },
      {
        name: '/api/hamali-entries/batch',
        query: `
          SELECT * FROM hamali_entries 
          WHERE arrival_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
          AND status = 'approved'
        `
      },
      {
        name: '/api/ledger/kunchinittus',
        query: `
          SELECT * FROM kunchinittus 
          WHERE "isActive" = true 
          ORDER BY name
        `
      },
      {
        name: '/api/rice-productions (date range)',
        query: `
          SELECT * FROM rice_productions 
          WHERE date >= '2026-01-01' AND date <= '2026-02-01'
          AND status = 'approved'
          ORDER BY date DESC
          LIMIT 100
        `
      }
    ];

    for (const { name, query } of slowQueries) {
      console.log(`\n🔍 Query: ${name}`);
      console.log('Query:', query.trim().replace(/\s+/g, ' '));
      
      try {
        const startTime = Date.now();
        const [results] = await sequelize.query(`EXPLAIN ANALYZE ${query}`);
        const duration = Date.now() - startTime;
        
        console.log(`⏱️  Execution time: ${duration}ms`);
        console.log('📋 Execution Plan:');
        results.forEach(row => {
          console.log(`   ${row['QUERY PLAN']}`);
        });
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // ============================================================================
    // 2. CHECK INDEX USAGE STATISTICS
    // ============================================================================
    console.log('\n\n📊 SECTION 2: Index Usage Statistics');
    console.log('-'.repeat(80));

    const tables = ['Arrivals', 'rice_productions', 'paddy_hamali_entries', 
                    'rice_hamali_entries', 'rice_stock_movements', 'hamali_entries'];

    for (const table of tables) {
      console.log(`\n📊 Table: ${table}`);
      
      try {
        // Get index usage stats
        const [indexStats] = await sequelize.query(`
          SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan as scans,
            idx_tup_read as tuples_read,
            idx_tup_fetch as tuples_fetched
          FROM pg_stat_user_indexes
          WHERE tablename = '${table}'
          ORDER BY idx_scan DESC;
        `);

        if (indexStats.length > 0) {
          console.log('  Index Usage:');
          indexStats.forEach(stat => {
            const usage = stat.scans > 0 ? '✅ USED' : '⚠️  UNUSED';
            console.log(`    ${usage} ${stat.indexname}: ${stat.scans} scans, ${stat.tuples_read} tuples read`);
          });
        } else {
          console.log('  ⚠️  No index statistics available');
        }

        // Get table size
        const [sizeInfo] = await sequelize.query(`
          SELECT 
            pg_size_pretty(pg_total_relation_size('${table}')) as total_size,
            pg_size_pretty(pg_relation_size('${table}')) as table_size,
            pg_size_pretty(pg_indexes_size('${table}')) as indexes_size
          FROM pg_class
          WHERE relname = '${table}';
        `);

        if (sizeInfo.length > 0) {
          console.log(`  Size: Table=${sizeInfo[0].table_size}, Indexes=${sizeInfo[0].indexes_size}, Total=${sizeInfo[0].total_size}`);
        }

        // Get row count
        const [countResult] = await sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`  Rows: ${countResult[0].count.toLocaleString()}`);

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // ============================================================================
    // 3. CHECK FOR MISSING INDEXES
    // ============================================================================
    console.log('\n\n📊 SECTION 3: Missing Index Analysis');
    console.log('-'.repeat(80));

    try {
      const [missingIndexes] = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          attname as column_name,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        AND tablename IN ('Arrivals', 'rice_productions', 'rice_stock_movements', 'hamali_entries')
        AND n_distinct > 100
        ORDER BY tablename, n_distinct DESC;
      `);

      console.log('\n🔍 High-cardinality columns (good candidates for indexes):');
      missingIndexes.forEach(col => {
        console.log(`  ${col.tablename}.${col.column_name}: ${col.n_distinct} distinct values (correlation: ${col.correlation})`);
      });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // ============================================================================
    // 4. CHECK SEQUENTIAL SCANS
    // ============================================================================
    console.log('\n\n📊 SECTION 4: Sequential Scan Analysis');
    console.log('-'.repeat(80));

    try {
      const [seqScans] = await sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          CASE 
            WHEN seq_scan > 0 THEN ROUND((100.0 * idx_scan / (seq_scan + idx_scan))::numeric, 2)
            ELSE 0
          END as index_usage_pct
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY seq_scan DESC
        LIMIT 10;
      `);

      console.log('\n📊 Tables with most sequential scans:');
      seqScans.forEach(stat => {
        const warning = stat.index_usage_pct < 50 ? '⚠️ ' : '✅';
        console.log(`  ${warning} ${stat.tablename}: ${stat.seq_scan} seq scans, ${stat.idx_scan} index scans (${stat.index_usage_pct}% index usage)`);
      });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // ============================================================================
    // 5. RECOMMENDATIONS
    // ============================================================================
    console.log('\n\n📊 SECTION 5: Performance Recommendations');
    console.log('-'.repeat(80));

    console.log(`
🎯 RECOMMENDATIONS:

1. **Monitor Real Query Times**
   - Check Render logs for actual API response times after indexes are applied
   - Look for queries still taking >150ms

2. **Connection Pooling** (if not already configured)
   - Set max connections: 20-50 for Render free tier
   - Set idle timeout: 10000ms
   - Enable connection reuse

3. **Query Optimization**
   - Use LIMIT on all list queries
   - Add pagination to large result sets
   - Avoid SELECT * - specify only needed columns

4. **Caching Strategy**
   - Cache frequently accessed data (kunchinittus list, locations)
   - Use Redis or in-memory cache for 5-10 minutes
   - Cache opening balances calculations

5. **Database Maintenance**
   - Run VACUUM ANALYZE periodically
   - Update table statistics: ANALYZE <table_name>
   - Monitor index bloat

6. **Render Free Tier Optimization**
   - Database sleeps after 15 min inactivity
   - First query after sleep will be slow (cold start)
   - Consider upgrading if consistent performance needed

📈 EXPECTED IMPROVEMENTS:
   - Arrivals queries: Should be <100ms with proper indexes
   - Hamali lookups: Should be <80ms
   - Stock calculations: Should be <150ms
   - Ledger queries: Should be <100ms

⚠️  IF STILL SLOW:
   - The issue may be connection latency (Render → Database)
   - Database cold starts (free tier limitation)
   - Need to check actual EXPLAIN ANALYZE on slow queries
   - May need query rewriting or denormalization
    `);

    console.log('\n✅ Deep analysis complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Check Render logs for actual API response times');
    console.log('   2. If still slow, run this script again to see query plans');
    console.log('   3. Consider connection pooling and caching');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

deepAnalysis();
