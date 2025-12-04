-- 添加阅读进度表缺失的字段
-- 此脚本用于将现有数据库更新到最新架构

USE ebook_library;

-- 检查并添加 current_page 字段
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'ebook_library' 
    AND TABLE_NAME = 'reading_progress' 
    AND COLUMN_NAME = 'current_page'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE reading_progress ADD COLUMN current_page INT DEFAULT 0 COMMENT ''当前页码''',
    'SELECT ''Column current_page already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 progress_percentage 字段
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'ebook_library' 
    AND TABLE_NAME = 'reading_progress' 
    AND COLUMN_NAME = 'progress_percentage'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE reading_progress ADD COLUMN progress_percentage FLOAT DEFAULT 0.0 COMMENT ''进度百分比''',
    'SELECT ''Column progress_percentage already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证字段是否添加成功
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_DEFAULT, 
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ebook_library' 
AND TABLE_NAME = 'reading_progress'
AND COLUMN_NAME IN ('current_page', 'total_pages', 'progress_percentage', 'current_chapter', 'scroll_position')
ORDER BY ORDINAL_POSITION;

-- 如果 percentage 字段有值但 progress_percentage 为空，则复制数据
UPDATE reading_progress 
SET progress_percentage = percentage 
WHERE progress_percentage = 0 AND percentage > 0;

SELECT '数据库迁移完成！' AS status;

