package com.team9.bucket_list.repository;

import com.team9.bucket_list.domain.entity.Post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findById (Long id);

    @Query("select p.member.id from Post p where p.member.id = :memberId")
    Long findByMemberId(@Param("memberId") Long memberId);
}
