package com.ebook.controller;

import com.ebook.dto.JwtResponse;
import com.ebook.dto.LoginRequest;
import com.ebook.dto.SignupRequest;
import com.ebook.entity.User;
import com.ebook.repository.UserRepository;
import com.ebook.utils.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {
    
    @Autowired
    AuthenticationManager authenticationManager;
    
    @Autowired
    UserRepository userRepository;
    
    @Autowired
    PasswordEncoder encoder;
    
    @Autowired
    JwtUtils jwtUtils;
    
    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
        
        return ResponseEntity.ok(new JwtResponse(jwt, user.getId(), user.getUsername(), user.getEmail(), user.getRole()));
    }
    
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        Map<String, String> response = new HashMap<>();
        
        try {
            // 验证用户名
            if (signUpRequest.getUsername() == null || signUpRequest.getUsername().trim().isEmpty()) {
                response.put("message", "用户名不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 验证密码
            if (signUpRequest.getPassword() == null || signUpRequest.getPassword().trim().isEmpty()) {
                response.put("message", "密码不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (userRepository.existsByUsername(signUpRequest.getUsername())) {
                response.put("message", "用户名已存在");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (signUpRequest.getEmail() != null && !signUpRequest.getEmail().trim().isEmpty()) {
                if (userRepository.existsByEmail(signUpRequest.getEmail().trim())) {
                    response.put("message", "邮箱已被使用");
                    return ResponseEntity.badRequest().body(response);
                }
            }
            
            User user = new User(signUpRequest.getUsername().trim(),
                    encoder.encode(signUpRequest.getPassword()),
                    signUpRequest.getEmail() != null ? signUpRequest.getEmail().trim() : null);
            
            user.setRole("ROLE_USER");
            userRepository.save(user);
            
            response.put("message", "注册成功");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("注册失败: " + e.getMessage());
            e.printStackTrace();
            response.put("message", "注册失败: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
}
