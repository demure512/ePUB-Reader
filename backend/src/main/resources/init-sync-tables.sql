-- 多设备同步功能数据库初始化脚本
-- 请在MySQL中执行此脚本来创建必要的表结构

USE ebook_library;

-- 创建用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    font_size INT DEFAULT 16,
    theme VARCHAR(20) DEFAULT 'light',
    reading_mode VARCHAR(20) DEFAULT 'default',
    line_height DECIMAL(3,1) DEFAULT 1.5,
    page_width INT DEFAULT 800,
    auto_save_progress BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- 为现有reading_progress表添加同步相关字段
ALTER TABLE reading_progress 
ADD COLUMN IF NOT EXISTS current_chapter VARCHAR(200),
ADD COLUMN IF NOT EXISTS scroll_position INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pages INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS device_info VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_book ON reading_progress(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_sync_time ON reading_progress(last_sync_time);

-- 插入示例用户设置（可选）
-- INSERT IGNORE INTO user_settings (user_id, font_size, theme, reading_mode, line_height, page_width, auto_save_progress)
-- SELECT id, 16, 'light', 'default', 1.5, 800, TRUE FROM users;

COMMIT;

-- 验证表结构
DESCRIBE user_settings;
DESCRIBE reading_progress;

SELECT 'Multi-device sync tables initialized successfully!' as status;