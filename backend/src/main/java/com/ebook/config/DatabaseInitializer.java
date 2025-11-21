package com.ebook.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    @Override
    public void run(String... args) throws Exception {
        logger.info("🔍 检查数据库表结构...");
        
        try {
            // 检查user_settings表是否存在
            checkUserSettingsTable();
            
            // 检查reading_progress表的新字段
            checkReadingProgressFields();
            
            // 清理重复的阅读进度记录
            cleanupDuplicateProgress();
            
            logger.info("✅ 数据库表结构检查完成，多设备同步功能已就绪！");
            
        } catch (Exception e) {
            logger.error("❌ 数据库表结构检查失败: {}", e.getMessage());
            logger.info("💡 提示：如果是首次启动，请确保MySQL服务正在运行");
        }
    }
    
    private void checkUserSettingsTable() {
        try {
            String sql = "SELECT COUNT(*) FROM information_schema.tables " +
                        "WHERE table_schema = DATABASE() AND table_name = 'user_settings'";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
            
            if (count != null && count > 0) {
                logger.info("✅ user_settings 表已存在");
                
                // 检查表结构
                String columnSql = "SELECT column_name FROM information_schema.columns " +
                                  "WHERE table_schema = DATABASE() AND table_name = 'user_settings'";
                var columns = jdbcTemplate.queryForList(columnSql, String.class);
                logger.info("📋 user_settings 表字段: {}", columns);
                
            } else {
                logger.warn("⚠️ user_settings 表不存在，将由JPA自动创建");
            }
        } catch (Exception e) {
            logger.warn("⚠️ 检查 user_settings 表时出错: {}", e.getMessage());
        }
    }
    
    private void checkReadingProgressFields() {
        try {
            String sql = "SELECT column_name FROM information_schema.columns " +
                        "WHERE table_schema = DATABASE() AND table_name = 'reading_progress'";
            var columns = jdbcTemplate.queryForList(sql, String.class);
            
            // 检查新增的同步字段
            String[] newFields = {"current_chapter", "scroll_position", "total_pages", "device_info", "last_sync_time"};
            boolean allFieldsExist = true;
            
            for (String field : newFields) {
                if (columns.contains(field)) {
                    logger.info("✅ reading_progress.{} 字段已存在", field);
                } else {
                    logger.warn("⚠️ reading_progress.{} 字段不存在，将由JPA自动创建", field);
                    allFieldsExist = false;
                }
            }
            
            if (allFieldsExist) {
                logger.info("✅ reading_progress 表的所有同步字段都已就绪");
            }
            
        } catch (Exception e) {
            logger.warn("⚠️ 检查 reading_progress 表字段时出错: {}", e.getMessage());
        }
    }
    
    private void cleanupDuplicateProgress() {
        try {
            logger.info("🔍 检查重复的阅读进度记录...");
            
            // 检查是否存在重复记录
            String checkSql = "SELECT COUNT(*) as duplicate_count FROM (" +
                             "SELECT user_id, book_id, COUNT(*) as cnt " +
                             "FROM reading_progress " +
                             "GROUP BY user_id, book_id " +
                             "HAVING COUNT(*) > 1" +
                             ") as duplicates";
            
            Integer duplicateCount = jdbcTemplate.queryForObject(checkSql, Integer.class);
            
            if (duplicateCount != null && duplicateCount > 0) {
                logger.warn("⚠️ 发现 {} 组重复的阅读进度记录，开始清理...", duplicateCount);
                
                // 执行清理操作
                String cleanupSql =
                    "DELETE rp1 FROM reading_progress rp1 " +
                    "INNER JOIN reading_progress rp2 " +
                    "WHERE rp1.user_id = rp2.user_id " +
                    "AND rp1.book_id = rp2.book_id " +
                    "AND (rp1.last_sync_time < rp2.last_sync_time " +
                    "     OR (rp1.last_sync_time IS NULL AND rp2.last_sync_time IS NOT NULL) " +
                    "     OR (rp1.last_sync_time = rp2.last_sync_time AND rp1.updated_at < rp2.updated_at) " +
                    "     OR (rp1.last_sync_time IS NULL AND rp2.last_sync_time IS NULL AND rp1.updated_at < rp2.updated_at) " +
                    "     OR (rp1.last_sync_time = rp2.last_sync_time AND rp1.updated_at = rp2.updated_at AND rp1.id < rp2.id))";
                
                int deletedRows = jdbcTemplate.update(cleanupSql);
                logger.info("✅ 已清理 {} 条重复的阅读进度记录", deletedRows);
                
            } else {
                logger.info("✅ 没有发现重复的阅读进度记录");
            }
            
        } catch (Exception e) {
            logger.warn("⚠️ 清理重复阅读进度记录时出错: {}", e.getMessage());
            logger.info("💡 提示：如果问题持续存在，可以手动执行 cleanup-duplicate-progress.sql 脚本");
        }
    }
}