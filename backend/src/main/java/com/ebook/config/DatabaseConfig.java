package com.ebook.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Configuration
public class DatabaseConfig {
    
    @Bean
    CommandLineRunner initDatabase(DataSource dataSource) {
        return args -> {
            try (Connection connection = dataSource.getConnection()) {
                // 创建数据库（如果不存在）
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CREATE DATABASE IF NOT EXISTS ebook_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    statement.execute("USE ebook_library");
                    
                    System.out.println("✅ 数据库初始化完成");
                }
            } catch (Exception e) {
                System.err.println("❌ 数据库初始化失败: " + e.getMessage());
            }
        };
    }
}