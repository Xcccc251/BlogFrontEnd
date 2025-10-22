package main

import (
	"fmt"
	"strconv"
	"strings"
)

// UpdateResult 更新结果
type UpdateResult struct {
	Success     bool   `json:"success"`
	UpdatedText string `json:"updated_text"`
	Message     string `json:"message"`
}

// addLineNumbers 为文本内容添加行号
func addLineNumbers(content string) string {
	if content == "" {
		return "暂无内容"
	}

	lines := strings.Split(content, "\n")
	var result []string

	for i, line := range lines {
		lineNumber := fmt.Sprintf("%3d", i+1) // 右对齐，3位宽度
		result = append(result, fmt.Sprintf("%s | %s", lineNumber, line))
	}

	return strings.Join(result, "\n")
}

// updateContentByLineNumber 按行号更新内容
func updateContentByLineNumber(content string, lineNumber string, newContent string) UpdateResult {
	// 解析行号
	parsedLineNumber, err := strconv.Atoi(lineNumber)
	if err != nil {
		return UpdateResult{
			Success: false,
			Message: fmt.Sprintf("解析行号失败: %v", err),
		}
	}

	// 验证参数
	if parsedLineNumber < 1 || newContent == "" {
		return UpdateResult{
			Success: false,
			Message: "参数格式不正确",
		}
	}

	// 将文章内容按行分割
	lines := strings.Split(content, "\n")

	// 将1-based行号转换为0-based索引
	arrayIndex := parsedLineNumber - 1

	// 更新指定行的内容
	if arrayIndex >= 0 && arrayIndex < len(lines) {
		lines[arrayIndex] = newContent

		return UpdateResult{
			Success:     true,
			UpdatedText: strings.Join(lines, "\n"),
			Message:     fmt.Sprintf("已更新第%d行内容为: %s", parsedLineNumber, newContent),
		}
	} else {
		return UpdateResult{
			Success: false,
			Message: fmt.Sprintf("行号 %d 超出范围，文章共有 %d 行", parsedLineNumber, len(lines)),
		}
	}
}

// updateContentByBlock 按块更新内容
func updateContentByBlock(content string, startLine string, endLine string, newContent string) UpdateResult {
	// 解析起始和结束行号
	start, err1 := strconv.Atoi(startLine)
	end, err2 := strconv.Atoi(endLine)

	if err1 != nil || err2 != nil {
		return UpdateResult{
			Success: false,
			Message: "解析行号失败",
		}
	}

	// 验证参数
	if start < 1 || end < start {
		return UpdateResult{
			Success: false,
			Message: "update_content_by_block 参数无效",
		}
	}

	lines := strings.Split(content, "\n")
	startIdx := start - 1
	endIdx := end - 1

	// 处理新内容，按换行符分割
	newLines := strings.Split(newContent, "\n")

	// 构建更新后的内容
	var updated []string
	updated = append(updated, lines[:startIdx]...)
	updated = append(updated, newLines...)
	updated = append(updated, lines[endIdx+1:]...)

	return UpdateResult{
		Success:     true,
		UpdatedText: strings.Join(updated, "\n"),
		Message:     fmt.Sprintf("已更新第%d-%d行内容", start, end),
	}
}

// 示例用法
func main() {
	content := `第一行内容
第二行内容
第三行内容
这是第四行
第五行内容`

	fmt.Println("原始内容:")
	fmt.Println(content)
	fmt.Println("\n添加行号后:")
	fmt.Println(addLineNumbers(content))

	// 测试按行号更新内容
	fmt.Println("\n=== 测试按行号更新内容 ===")
	result1 := updateContentByLineNumber(content, "2", "这是更新后的第二行")
	fmt.Printf("更新结果: %s\n", result1.Message)
	if result1.Success {
		fmt.Println("更新后的内容:")
		fmt.Println(addLineNumbers(result1.UpdatedText))
	}

	// 测试按块更新内容
	fmt.Println("\n=== 测试按块更新内容 ===")
	newBlockContent := `新的第二行
新的第三行
新的第四行
额外添加的行`
	result2 := updateContentByBlock(content, "2", "4", newBlockContent)
	fmt.Printf("更新结果: %s\n", result2.Message)
	if result2.Success {
		fmt.Println("更新后的内容:")
		fmt.Println(addLineNumbers(result2.UpdatedText))
	}

	// 测试空内容
	fmt.Println("\n=== 空内容测试 ===")
	fmt.Println(addLineNumbers(""))
}
