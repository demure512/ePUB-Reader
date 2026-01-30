package com.ebook.repository;

import com.ebook.entity.Book;
import com.ebook.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {
    @Query("SELECT DISTINCT b FROM Book b LEFT JOIN FETCH b.readingProgresses rp WHERE b.user = :user AND (rp.user = :user OR rp is NULL) ORDER BY b.createdAt DESC")
    List<Book> findBooksAndProgressByUser(@Param("user") User user);
    
    List<Book> findByUserAndCategoryOrderByCreatedAtDesc(User user, String category);
    
    @Query("SELECT DISTINCT b.category FROM Book b WHERE b.user = :user AND b.category IS NOT NULL")
    List<String> findCategoriesByUser(@Param("user") User user);
    
    @Query("SELECT b FROM Book b WHERE b.user = :user AND " +
           "(LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(b.author) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Book> searchBooks(@Param("user") User user, @Param("keyword") String keyword);
    
    @Query("SELECT b FROM Book b WHERE b.user = :user AND b.category = :category AND " +
           "(LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(b.author) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Book> searchBooksByCategory(@Param("user") User user, @Param("category") String category, @Param("keyword") String keyword);
    
    @Query("SELECT b FROM Book b WHERE b.user = :user AND (b.category IS NULL OR b.category = '') AND " +
           "(LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(b.author) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Book> searchUncategorizedBooks(@Param("user") User user, @Param("keyword") String keyword);
    
    /**
     * Get all books ordered by creation date (for admin view)
     */
    @Query("SELECT b FROM Book b ORDER BY b.createdAt DESC")
    List<Book> findAllOrderByCreatedAtDesc();
    
    /**
     * Get all books with pagination (for admin view)
     */
    @Query("SELECT b FROM Book b ORDER BY b.createdAt DESC")
    org.springframework.data.domain.Page<Book> findAllBooks(org.springframework.data.domain.Pageable pageable);
    
    /**
     * Count all books
     */
    @Query("SELECT COUNT(b) FROM Book b")
    Long countAllBooks();
}