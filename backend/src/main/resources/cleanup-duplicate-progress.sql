-- 清理重复的阅读进度记录，只保留最新的记录
-- 这个脚本会删除重复的 reading_progress 记录，只保留每个用户每本书的最新记录

-- 1. 创建临时表存储要保留的记录ID
CREATE TEMPORARY TABLE temp_keep_progress AS
SELECT 
    MIN(rp.id) as keep_id,
    rp.user_id,
    rp.book_id,
    COUNT(*) as duplicate_count
FROM reading_progress rp
GROUP BY rp.user_id, rp.book_id
HAVING COUNT(*) > 1;

-- 2. 对于有重复的记录，找出最新的那条记录
UPDATE temp_keep_progress tkp
SET keep_id = (
    SELECT rp.id 
    FROM reading_progress rp 
    WHERE rp.user_id = tkp.user_id 
      AND rp.book_id = tkp.book_id
    ORDER BY 
        CASE WHEN rp.last_sync_time IS NOT NULL THEN rp.last_sync_time ELSE rp.updated_at END DESC,
        rp.id DESC
    LIMIT 1
);

-- 3. 删除重复的记录（保留最新的）
DELETE rp FROM reading_progress rp
INNER JOIN temp_keep_progress tkp ON rp.user_id = tkp.user_id AND rp.book_id = tkp.book_id
WHERE rp.id != tkp.keep_id;

-- 4. 显示清理结果
SELECT 
    SUM(duplicate_count - 1) as deleted_records,
    COUNT(*) as affected_user_book_pairs
FROM temp_keep_progress;

-- 5. 清理临时表
DROP TEMPORARY TABLE temp_keep_progress;

-- 6. 添加唯一约束（如果不存在）
-- 注意：这个约束已经在 ReadingProgress 实体中定义，JPA会自动创建
-- 但如果需要手动添加，可以使用以下语句：
-- ALTER TABLE reading_progress ADD CONSTRAINT uk_user_book UNIQUE (user_id, book_id);