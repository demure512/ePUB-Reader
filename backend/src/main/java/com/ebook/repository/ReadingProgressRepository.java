package com.ebook.repository;

import com.ebook.entity.Book;
import com.ebook.entity.ReadingProgress;
import com.ebook.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, Long> {
    
    /**
     * 根据用户和书籍查找阅读进度（如果有重复记录，返回最新的）
     */
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.user = :user AND rp.book = :book " +
           "ORDER BY CASE WHEN rp.lastSyncTime IS NOT NULL THEN rp.lastSyncTime ELSE rp.updatedAt END DESC")
    List<ReadingProgress> findByUserAndBookOrderByLastSyncTimeDesc(@Param("user") User user, @Param("book") Book book);
    
    /**
     * 根据用户和书籍查找阅读进度（保持原有方法兼容性）
     */
    default Optional<ReadingProgress> findByUserAndBook(User user, Book book) {
        List<ReadingProgress> results = findByUserAndBookOrderByLastSyncTimeDesc(user, book);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }
    
    /**
     * 删除指定书籍的所有阅读进度
     */
    void deleteByBook(Book book);
    
    /**
     * 根据用户查找所有阅读进度，按最后同步时间和更新时间降序排列
     */
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.user = :user ORDER BY " +
           "CASE WHEN rp.lastSyncTime IS NOT NULL THEN rp.lastSyncTime ELSE rp.updatedAt END DESC")
    List<ReadingProgress> findByUserOrderByLastSyncTimeDescUpdatedAtDesc(@Param("user") User user);
    
    /**
     * 根据用户查找有阅读进度的书籍（进度大于0）
     */
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.user = :user AND rp.percentage > 0 " +
           "ORDER BY CASE WHEN rp.lastSyncTime IS NOT NULL THEN rp.lastSyncTime ELSE rp.updatedAt END DESC")
    List<ReadingProgress> findByUserWithProgressOrderByLastSyncTimeDesc(@Param("user") User user);
    
    /**
     * 根据用户和设备信息查找阅读进度
     */
    List<ReadingProgress> findByUserAndDeviceInfoOrderByLastSyncTimeDesc(User user, String deviceInfo);
    
    /**
     * 查找用户最近阅读的书籍（限制数量）
     */
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.user = :user " +
           "ORDER BY CASE WHEN rp.lastSyncTime IS NOT NULL THEN rp.lastSyncTime ELSE rp.updatedAt END DESC")
    List<ReadingProgress> findRecentReadingByUser(@Param("user") User user);
}