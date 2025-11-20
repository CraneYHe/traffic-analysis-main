# DataAnalysisView 组件说明

## 功能概述

DataAnalysisView 是一个完整的交通数据分析组件，提供以下功能：

1. **CSV 文件上传**：支持上传交通数据 CSV 文件
2. **多城市分析**：可同时分析多个城市的数据
3. **多种分析方法**：
   - IQR (四分位距法)
   - Z-Score (Z分数法)
   - Window (滑动窗口法)
4. **时间范围筛选**：可指定分析的时间范围
5. **异常值检测**：自动标记缺失值和异常值
6. **可视化展示**：使用 ECharts 展示时序数据和异常点

## 安装依赖

要启用完整的图表功能，需要安装以下依赖：

```powershell
npm install echarts-for-react echarts
```

## API 请求格式

### 请求端点
```
POST http://your-api-endpoint/analyze
```

### 请求参数 (FormData)
```typescript
{
  csv_file: File,                    // 必填，CSV 文件
  city_id: string,                   // 必填，城市列索引数组的 JSON 字符串，如 "[0,1,2]"
  method: string,                    // 可选，异常值分析方法，默认 'iqr'
                                     // 支持: "iqr" / "z_score" / "window"
  start_time: string,                // 可选，格式 "YYYY-MM-DD HH:mm:ss"
  end_time: string,                  // 可选，格式 "YYYY-MM-DD HH:mm:ss"
  window_size: string,               // 可选，仅当 method="window" 时有效
  z_thresh: string                   // 可选，仅当 method="z_score" 时有效
}
```

### 响应格式
```typescript
{
  status: "success" | "error",
  message: string,
  data: {
    points: {
      [cityName: string]: {
        x: string[],              // 时间戳数组
        y: number[],              // 流量数值数组
        missing: number[],        // 缺失值的索引数组
        outliers: number[]        // 异常值的索引数组
      }
    },
    stats: {
      [cityName: string]: {
        total: number,            // 总数据点数
        mean: number,             // 平均值
        std: number,              // 标准差
        missing: number,          // 缺失值数量
        outlier: number           // 异常值数量
      }
    }
  }
}
```

## 使用示例

组件会自动处理文件上传、参数配置和数据可视化：

1. 点击"选择 CSV 文件"上传数据文件
2. 在下拉列表中选择一个或多个城市ID
3. 选择分析方法（IQR/Z-Score/Window）
4. 可选：设置时间范围和方法特定参数
5. 点击"开始分析"按钮发送请求
6. 查看统计信息和可视化图表

## 图表功能

- **多条数据线**：每个城市显示为一条独立的折线
- **缺失值标记**：橙色圆点标记缺失的数据点
- **异常值标记**：红色菱形标记异常数据点
- **数据缩放**：支持鼠标滚轮缩放和拖拽
- **图例交互**：点击图例可显示/隐藏对应的数据线

## 注意事项

1. 请确保后端 API 端点正确配置（在代码第 95 行修改）
2. CSV 文件格式需要符合后端要求
3. 城市ID从0开始计数
4. 如未安装 echarts-for-react，将显示占位符和配置数据预览
