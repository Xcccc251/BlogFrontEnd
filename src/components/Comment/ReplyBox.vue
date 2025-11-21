<script setup lang="ts">

import {emojis} from "@/utils/O.o/emoji.ts";
import {heo} from "@/utils/O.o/heo.ts";
import {ElMessage} from "element-plus";
import {addComment} from "@/apis/article";

const route = useRoute()

const prop = defineProps({
  comment: {
    type: Object,
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

const emojiOptions = ref(['Emoji', 'Heo'])
const options = ref()
// 选中下标
const optionsIndex = ref(0)
const emojiBtn = ref()
// 评论框
const myInput = ref();
onMounted(() => {
  options.value.children[optionsIndex.value].style.backgroundColor = '#7B5F69'
  options.value.children[optionsIndex.value].style.color = 'white'

  myInput.value.addEventListener('focus', function () {
    myInput.value.classList.add('active');
  });
  myInput.value.addEventListener('blur', function () {
    if (prop.comment.replyText === '' || prop.comment.replyText === undefined) {
      myInput.value.classList.remove('active');
    }
  });
})

function optionEmoji(index: number) {
  optionsIndex.value = index
  // 清除前面样式
  for (let i = 0; i < options.value.children.length; i++) {
    options.value.children[i].style.backgroundColor = 'white'
    options.value.children[i].style.color = '#4A4A4A'
  }
  // 给选中的div添加样式
  options.value.children[index].style.backgroundColor = '#7B5F69'
  options.value.children[index].style.color = 'white'
}

function showEmojis() {
  myInput.value.focus()
}

function addEmoji(emoji: string, comment: object) {
  // 在对应焦点的位置插入
  if (myInput.value.selectionStart || myInput.value.selectionStart === 0) {
    const startPos = myInput.value.selectionStart
    const endPos = myInput.value.selectionEnd
    const restoreTop = myInput.value.scrollTop
    myInput.value.value = myInput.value.value.substring(0, startPos) + emoji + myInput.value.value.substring(endPos, myInput.value.value.length)
    if (restoreTop > 0) {
      myInput.value.scrollTop = restoreTop
    }
    myInput.value.focus()
    myInput.value.selectionStart = startPos + emoji.length
    myInput.value.selectionEnd = startPos + emoji.length
  } else {
    myInput.value.value += emoji
    myInput.value.focus()
  }
  comment.replyText = myInput.value.value
}

// 添加子评论
function addChildComment(comment: any) {
  if (comment.replyText === '' || comment.replyText === undefined) {
    ElMessage.warning('评论内容不能为空')
    return
  }
  const data = {
    type: prop.type,
    typeId: comment.typeId,
    commentContent: comment.replyText,
    parentId: comment.parentId == null ? comment.id : comment.parentId,
    replyId: comment.id,
    replyUserId: comment.commentUserId
  }
  addComment(data).then(res => {
    if (res.code === 200) {
      ElMessage.success("回复成功");
      if (res.data) {
        ElNotification({
          title: '回复成功',
          duration: 4000,
          type: 'warning',
          message: h('i', { style: 'color: teal' }, res.data),
        })
      }
      comment.replyText = ''
      prop.getComments(route.params.id, '1', prop.pageSize)
    } else if (res.code === 1002) {
      ElMessage.error(res.msg);
    }
  })
}

</script>

<template>
  <transition name="el-zoom-in-top">
    <div class="reply" v-show="comment.showReplyBox">
      <textarea style="color: #7B5F69;" ref="myInput" v-model="comment.replyText" :placeholder="'@'+comment.commentUserNickname"/>
      <div>
        <div ref="emojiBtn">
          <el-popover
              placement="bottom-end"
              :width="510"
              trigger="click"
              @before-enter="showEmojis"
          >
            <template #reference>
              <svg-icon name="emojis" width="1.5em" height="1.5em"
                        style="margin-right: 0.8rem;cursor: pointer"/>
            </template>
            <div class="emojis_container">
              <el-scrollbar>
                <div class="OvO_emojis" v-show="optionsIndex === 0">
                  <div @click="addEmoji(emoji,comment)" v-for="(emoji,key) in emojis" :key="key" :title="key">
                    {{ emoji }}
                  </div>
                </div>
                <div class="OvO_heo" v-show="optionsIndex === 1">
                  <div>
                    <img @click="addEmoji(key,comment)" v-for="(src,key) in heo" :key="key" :title="key" :src="src"/>
                  </div>
                </div>
                <div class="OvO_options" ref="options">
                  <div class="item_emoji" v-for="(emojiOption,index) in emojiOptions" @click="optionEmoji(index)">
                    {{ emojiOption }}
                  </div>
                </div>
              </el-scrollbar>
            </div>
          </el-popover>
        </div>
        <el-button type="danger" plain size="small" @click="addChildComment(comment)">发布</el-button>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="scss">
.reply {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);

  .active {
    height: 5rem;
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-color-primary);
    box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
  }

  textarea {
    width: 100%;
    height: 2.5rem;
    transition: all 0.3s ease;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 0.8rem;
    resize: none;
    outline: none;
    font-size: 0.9rem;
    background: var(--el-fill-color-blank);
    color: var(--el-text-color-primary);
    line-height: 1.5;

    &:focus {
      border-color: var(--el-color-primary);
      background: var(--el-fill-color-blank);
    }

    &::-webkit-input-placeholder {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--el-text-color-placeholder);
    }
  }

  div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.8rem;

    .el-button {
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    }
  }
}

.emojis_container {
  height: 20em;
  width: 100%;

  .OvO_heo {
    div {
      display: flex;
      flex-wrap: wrap;
      width: 100%;
      height: 100%;
      padding: 0.5rem;
      cursor: pointer;

      img {
        width: 3em;
        height: 3em;
        border-radius: 6px;
        transition: all 0.2s ease;

        &:hover {
          background-color: var(--el-fill-color-light);
          transform: scale(1.1);
        }
      }
    }
  }

  .OvO_emojis {
    display: flex;
    flex-wrap: wrap;
    padding: 0.5rem;

    div {
      font-size: 1.8rem;
      width: 1.5em;
      height: 1.8em;
      color: var(--el-text-color-regular);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;

      &:hover {
        background-color: var(--el-fill-color-light);
        transform: scale(1.15);
      }
    }
  }

  .OvO_options {
    position: sticky;
    bottom: 0;
    background: var(--el-fill-color-blank);
    display: flex;
    flex-wrap: wrap;
    border-top: 1px solid var(--el-border-color-lighter);
    justify-content: flex-start;
    width: 100%;
    padding: 0.3rem;

    .item_emoji {
      width: 4em;
      height: 2em;
      color: var(--el-text-color-regular);
      display: flex;
      justify-content: center;
      align-items: center;
      margin-right: 0.26rem;
      cursor: pointer;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;

      &:first-child {
        background-color: var(--el-color-primary);
        color: white;
      }

      &:hover {
        background-color: var(--el-fill-color);
      }
    }
  }
}
</style>