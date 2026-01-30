package com.ebook.repository;

import com.ebook.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE u.email = :email AND u.email IS NOT NULL")
    boolean existsByEmail(@Param("email") String email);
    
    Optional<User> findByEmail(String email);
    
    /**
     * Count users by role
     */
    Long countByRole(String role);
    
    /**
     * Find all users ordered by creation date
     */
    List<User> findAllByOrderByCreatedAtDesc();
    
    /**
     * Find users by role
     */
    List<User> findByRoleOrderByCreatedAtDesc(String role);
}