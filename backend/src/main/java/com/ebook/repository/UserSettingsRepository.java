package com.ebook.repository;

import com.ebook.entity.UserSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserSettingsRepository extends JpaRepository<UserSettings, Long> {
    
    /**
     * 根据用户ID查找用户设置
     */
    Optional<UserSettings> findByUserId(Long userId);
    
    /**
     * 检查用户是否已有设置
     */
    boolean existsByUserId(Long userId);
    
    /**
     * 根据用户ID删除设置
     */
    void deleteByUserId(Long userId);
    
    /**
     * 获取用户设置，如果不存在则创建默认设置
     */
    @Query("SELECT us FROM UserSettings us WHERE us.userId = :userId")
    Optional<UserSettings> findByUserIdWithDefault(@Param("userId") Long userId);
}