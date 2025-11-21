<script setup lang="ts">

import {MdPreview} from "md-editor-v3";

defineProps({
  comment: {
    type: Object,
    required: true
  },
  authorId: {
    type: Number,
    required: true
  },
  showAllChildComments: {
    type: Boolean,
    required: false
  },
  likeBtn: {
    type: Function,
    required: true
  },
  cancelLikeBtn: {
    type: Function,
    required: true
  },
  replyBtn: {
    type: Function,
    required: true
  },
  getComments: {
    type: Function,
    required: true
  },
  pageSize: {
    type: Number,
    required: true
  },
  type: Number,
})

</script>

<template>
  <div v-for="(child,index) in comment.childComment" :key="child.id">
    <div v-if="index === 0 || showAllChildComments === true">
      <div class="parent_container">
        <el-avatar shape="square" :size="40"
                   :src="child.commentUserAvatar"/>
        <div class="comment_content">
          <div class="comment_content_header">
            <div>
              <div>{{ child.commentUserNickname }}</div>
              <div v-if="child.commentUserId === authorId">
                <el-tag size="small">作者</el-tag>
              </div>
              <div>{{ child.createTime }}</div>
            </div>
            <div>
              <SvgIcon @click="likeBtn(child)" v-show="!child.isLike" name="like" style="cursor: pointer"/>
              <SvgIcon @click="cancelLikeBtn(child)" v-show="child.isLike" name="like-selected"
                       style="cursor: pointer"/>
              <span style="font-size: 0.8em;color: grey">{{ child.likeCount }}</span>
              <svg-icon @click="replyBtn(comment.childComment,child.id)" name="comment"
                        style="margin:0 0.2em 0 0.5rem;cursor: pointer"/>
              <span style="font-size: 0.8em;color: grey">{{ child.childCommentCount }}</span>
            </div>
          </div>
          <!-- 子评论 -->
          <div class="comment_content_body">
            <div class="reply-content-inline">
              <span class="reply-prefix">
                <span style="font-weight: 600">回复</span>
                <span class="replyUserNickname">@{{ child.replyUserNickname }}</span>
                <span>：</span>
              </span>
              <span class="reply-text">
                <MdPreview :modelValue="child.commentContent"/>
              </span>
            </div>
          </div>
          <!-- TODO 评论信息 -->
          <!--          <div class="comment_content_footer">-->
          <!--            <div><span><SvgIcon name="windows_icon"/></span>window 11</div>-->
          <!--            <div><span><SvgIcon name="google_icon"/></span>google chrome</div>-->
          <!--            <div><span><SvgIcon name="address_icon"/></span>北京</div>-->
          <!--          </div>-->
          <ReplyBox :type="type" :comment="child" :get-comments="getComments" :page-size="pageSize"/>
        </div>
      </div>
      <div v-if="child.childComment && child.childComment.length">
        <ChildComment :reply-btn="replyBtn" :like-btn="likeBtn" :cancel-like-btn="cancelLikeBtn" :comment="child"
                      :author-id="authorId"
                      :get-comments="getComments" :page-size="pageSize"
                      :type="type"
        />
      </div>
    </div>
  </div>

</template>

<style scoped lang="scss">
@import "./index";

.parent_container {
  display: flex;
  margin-top: 1.2rem;
  padding: 1rem 0;
  border-top: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-fill-color-light);
    border-radius: 8px;
    padding-left: 0.8rem;
  }

  .el-avatar {
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
}

.reply-content-inline {
  display: flex;
  align-items: flex-start;
  width: 100%;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;

  .reply-prefix {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    font-size: 0.9rem;
    color: var(--el-text-color-regular);
    margin-right: 0.3rem;
  }

  .reply-text {
    display: inline;
    flex: 1;
    min-width: 0;

    :deep(.md-editor-preview-wrapper) {
      display: inline;
    }

    :deep(.default-theme) {
      display: inline;
    }

    :deep(.default-theme p) {
      display: inline;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      padding: 0;
    }
  }
}

.replyUserNickname {
  color: var(--el-color-primary);
  font-weight: 600;
  margin: 0 0.2rem;
  cursor: pointer;
  transition: color 0.3s ease;

  &:hover {
    color: var(--el-color-primary-light-3);
  }
}
</style>