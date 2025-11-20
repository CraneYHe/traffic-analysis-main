import { useState, useEffect, useRef } from 'react';
import { Card, Slider, InputNumber, Row, Col, Typography } from 'antd';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const { Text } = Typography;

interface PredictionData {
  pred: number[];
  seq: string;
  success: boolean;
  start?: number | string;
  end?: number | string;
}

interface TrainingChartsProps {
  predictionData?: PredictionData;
}

const TrainingCharts: React.FC<TrainingChartsProps> = ({ predictionData }) => {
  const [dnaRange, setDnaRange] = useState<[number, number]>([0, 100]);
  const [dnaSequence, setDnaSequence] = useState<string>('');
  const [chartData, setChartData] = useState<Array<{ position: number; value: number }>>([]);
  const [displayLength, setDisplayLength] = useState<number>(100); // 展示区间的长度
  const [filteredData, setFilteredData] = useState<Array<{ position: number; value: number }>>([]);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [maxValue, setMaxValue] = useState<number>(0); // 存储最大值
  const [genomeStart, setGenomeStart] = useState<number>(0); // 存储基因组起始位置偏移
  const chartRef = useRef<HTMLDivElement>(null);
  
  // 鼠标选择相关状态
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  // 当预测数据改变时更新
  useEffect(() => {
    if (predictionData && predictionData.success && predictionData.pred && predictionData.seq) {
      setDnaSequence(predictionData.seq);
      
      // 获取基因组起始位置
      const startOffset = predictionData.start !== undefined ? parseInt(predictionData.start as any) : 0;
      setGenomeStart(startOffset);
      
      // 将预测数据转换为图表格式，position 加上起始偏移
      const data = predictionData.pred.map((value, index) => ({
        position: startOffset + index,
        value: value
      }));
      setChartData(data);
      
      // 设置初始展示长度
      const initialLength = Math.max(100, Math.floor(predictionData.seq.length));
      setDisplayLength(initialLength);
      setDnaRange([startOffset, startOffset + initialLength]);
    }
  }, [predictionData]);

  // 当范围改变时更新过滤后的数据（提高响应速度）
  useEffect(() => {
    const filtered = chartData.filter(item => item.position >= dnaRange[0] && item.position < dnaRange[1]);
    setFilteredData(filtered);
    // 计算当前显示范围内的最大值
    if (filtered.length > 0) {
      const max = Math.max(...filtered.map(d => d.value));
      setMaxValue(max);
    } else {
      setMaxValue(0);
    }
  }, [dnaRange, chartData]);

  // 监听图表宽度变化
  useEffect(() => {
    const updateChartWidth = () => {
      if (chartRef.current) {
        const width = chartRef.current.offsetWidth;
        setChartWidth(width);
      }
    };

    updateChartWidth();
    window.addEventListener('resize', updateChartWidth);
    return () => window.removeEventListener('resize', updateChartWidth);
  }, []);

  const DNA_LENGTH = dnaSequence.length || 100;

  // 获取当前展示的DNA序列片段
  const getDisplaySequence = () => {
    if (!dnaSequence) return 'No sequence loaded';

    const [start, end] = dnaRange;
    // dnaRange 是真实坐标，需要减去 genomeStart 得到序列索引
    const relativeStart = start - genomeStart;
    const relativeEnd = end - genomeStart;
    let sequence = dnaSequence.slice(relativeStart, relativeEnd);
    const fullSequenceLength = sequence.length;

    // 如果没有图表宽度，返回完整序列
    if (!chartWidth) {
      return sequence;
    }

    // 计算可用宽度
    const availableWidth = chartWidth - 16;

    // 计算图表宽度能容纳的最大字符数（使用标准字符宽度14px）
    const maxChars = Math.floor(availableWidth / 14);

    // 如果当前序列长度超过图表能容纳的字符数，截取合适长度
    if (fullSequenceLength > maxChars && maxChars > 0) {
      // 从序列中间开始，取maxChars个字符
      const startOffset = Math.floor((fullSequenceLength - maxChars) / 2);
      sequence = sequence.slice(startOffset, startOffset + maxChars);
    }

    // 返回处理后的序列，使用标准间距
    return sequence;
  };

  // 生成序列坐标轴数据（每个字符对应y=0的点）
  const getSequenceAxisData = () => {
    const sequence = getDisplaySequence();
    if (!sequence || sequence === 'No sequence loaded') return [];

    const [start] = dnaRange;
    const relativeStart = start - genomeStart;
    
    return sequence.split('').map((char, index) => ({
      position: relativeStart + index,// 使用相对于序列字符串的位置
      character: char,
      value: 0
    }));
  };

  // 自定义tick组件，为不同碱基显示不同颜色
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const sequenceData = getSequenceAxisData();
    const char = sequenceData[payload.index]?.character || '';
    
    // 定义碱基颜色
    const baseColors: { [key: string]: string } = {
      'A': '#4CAF50', // 绿色
      'T': '#F44336', // 红色
      'G': '#FF9800', // 橙色
      'C': '#2196F3', // 蓝色
    };
    
    const color = baseColors[char] || '#000000'; // 默认黑色
    
    return (
      <text x={x} y={y} dy={16} textAnchor="middle" fill={color} fontSize={15} fontFamily="monospace">
        {char}
      </text>
    );
  };  const handleRangeChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      setDnaRange([value[0], value[1]]);
      setDisplayLength(value[1] - value[0]);
    }
  };

  const handleLengthChange = (value: number | null) => {
    if (value !== null && value > 0 && value <= DNA_LENGTH) {
      const [start] = dnaRange;
      const newEnd = Math.min(start + value, genomeStart + DNA_LENGTH);
      setDnaRange([start, newEnd]);
      setDisplayLength(value);
    }
  };

  // 处理鼠标选择
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel !== undefined) {
      setIsSelecting(true);
      setSelectionStart(e.activeLabel);
      setSelectionEnd(e.activeLabel);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isSelecting && e && e.activeLabel !== undefined) {
      setSelectionEnd(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionStart !== null && selectionEnd !== null) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      if (start !== end) {
        setDnaRange([start, end + 1]);
        setDisplayLength(end - start + 1);
      }
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // 计算选择区域的显示
  const getSelectionBox = () => {
    if (!isSelecting || selectionStart === null || selectionEnd === null) return null;
    
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    
    return { start, end };
  };

  const selectionBox = getSelectionBox();

  // 计算选择框相对于绘图区的百分比位置（考虑 y 轴 与 右侧图例宽度）
  const getSelectionPercent = () => {
    if (!selectionBox) return { xPercent: 0, widthPercent: 0 };

    // 可见窗口长度（防止为0）
    const total = Math.max(1, dnaRange[1] - dnaRange[0]);

    // 选择长度：这里把 end 当作包含端（组件中 handleMouseUp 使用了 end + 1 来设置 dnaRange）
    const selectionLen = (selectionBox.end - selectionBox.start + 1);

    // 估算绘图区左右需要保留的像素：y 轴标签宽度与右侧图例宽度
    const yAxisWidthPx = 65; // 估算 y 轴占用的像素宽度（可根据实际调整）
    const legendWidthPx = 128; // 与图例容器宽度对应

    // 将像素宽度转换为百分比（基于 chartWidth）
    const leftMarginPercent = chartWidth ? (yAxisWidthPx / chartWidth) * 100 : 5;
    const rightMarginPercent = chartWidth ? (legendWidthPx / chartWidth) * 100 : 20;

    // 绘图区占用的百分比（去掉左右预留）
    const plotPercent = Math.max(1, 100 - leftMarginPercent - rightMarginPercent);

    // 先计算在绘图区内的相对位置，再偏移到整体百分比坐标
    let xPercent = ((selectionBox.start - dnaRange[0]) / total) * plotPercent + leftMarginPercent;
    let widthPercent = (selectionLen / total) * plotPercent;

    // 限制范围，避免超出绘图区或出现负值
    xPercent = Math.max(leftMarginPercent, Math.min(100 - rightMarginPercent, xPercent));
    widthPercent = Math.max(0, Math.min(100 - leftMarginPercent - rightMarginPercent, widthPercent));

    return { xPercent, widthPercent };
  };

  const { xPercent, widthPercent } = getSelectionPercent();

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <Card 
        title="Prediction Values"
        bordered={true}
        style={{ flex: 1, background: '#fff' }}
      >
        <div ref={chartRef} style={{ 
          position: 'relative',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart 
              data={filteredData}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <XAxis 
                dataKey="position" 
                label={{ value: 'Position', position: 'insideBottom', offset: -5 }}
                domain={[dnaRange[0], dnaRange[1]]}
              />
              <YAxis 
                label={{ value: 'Prediction Value', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend 
                layout="vertical"
                align="right"
                verticalAlign="middle"
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Predicted Value"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!payload || payload.value === undefined) {
                    return <circle cx={cx} cy={cy} r={1} fill="#8884d8" />;
                  }
                  const isMax = payload.value === maxValue && maxValue > 0;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={isMax ? 4 : 1} fill={isMax ? '#D8BFD8' : '#8884d8'} />
                      {isMax && (
                        <text x={cx + 25} y={cy} textAnchor="start" dy="0.3em" fill="#D8BFD8" fontWeight="bold" fontSize={14}>
                          {payload.value.toFixed(2)}
                        </text>
                      )}
                    </g>
                  );
                }}
                isAnimationActive={false}
              />
              {/* 显示选择区域 */}
              {selectionBox && (
                <rect
                  x={`${xPercent.toFixed(2)}%`}
                  y="0"
                  width={`${widthPercent.toFixed(2)}%`}
                  height="100%"
                  fill="rgba(135, 206, 250, 0.3)"
                  stroke="rgba(135, 206, 250, 0.8)"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          {/* 序列坐标轴 */}
          <div style={{ marginTop: 5, height: '80px', display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSequenceAxisData()}>
                  <XAxis
                    dataKey="position"
                    tick={CustomTick}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 0]}
                    tick={false}
                    axisLine={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="transparent"
                    strokeWidth={0}
                    name="DNA Sequence"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* 碱基颜色图例 */}
            <div style={{ width: '120px', padding: '8px', background: '#fafafa', borderRadius: '4px', marginLeft: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Nucleobases</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '11px' }}>A</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#F44336', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '11px' }}>T</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#FF9800', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '11px' }}>G</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#2196F3', borderRadius: '2px' }}></div>
                  <span style={{ fontSize: '11px' }}>C</span>
                </div>
              </div>
            </div>
          </div>

          {/* 滑动条控制器 */}
          <div style={{ marginTop: '20px', padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
            <Row gutter={16} align="middle">
              <Col span={3}>
                <Text strong>Start:</Text>
                <InputNumber
                  min={genomeStart}
                  max={genomeStart + DNA_LENGTH - 1}
                  value={dnaRange[0]}
                  onChange={(value) => {
                    if (value !== null) {
                      const newEnd = Math.min(value + displayLength, genomeStart + DNA_LENGTH);
                      setDnaRange([value, newEnd]);
                    }
                  }}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col span={3}>
                <Text strong>Display Length:</Text>
                <InputNumber
                  min={1}
                  max={DNA_LENGTH}
                  value={displayLength}
                  onChange={handleLengthChange}
                  style={{ width: '100%', marginTop: 4 }}
                />
              </Col>
              <Col span={18}>
                <Slider
                  range={{draggableTrack: true}}
                  min={genomeStart}
                  max={genomeStart + DNA_LENGTH}
                  value={dnaRange}
                  onChange={handleRangeChange}
                  tooltip={{ 
                    formatter: (value) => `${value} bp`
                  }}
                  trackStyle={[{
                    backgroundColor: '#0050b3'
                  }]}
                  handleStyle={[{
                    borderColor: '#0050b3'
                  }, {
                    borderColor: '#0050b3'
                  }]}
                />
              </Col>
            </Row>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TrainingCharts;
