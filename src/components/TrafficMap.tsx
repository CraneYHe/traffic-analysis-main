import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Slider, Card, Typography } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import type { CityType, CityConfig } from '../App';

const { Title, Text } = Typography;

// 城市中心坐标配置
const CITY_CENTERS: Record<CityType, { center: [number, number]; zoom: number }> = {
  milan: { center: [45.4642, 9.1900], zoom: 11 },
  trento: { center: [46.0664, 11.1257], zoom: 10 }
};

interface TrafficMapProps {
  geoJsonData: any;
  trafficData: {
    timestamp: string;
    data: Array<{
      name: string;
      value: number;
    }>;
  }[];
  minTraffic: number;
  maxTraffic: number;
  cityType: CityType;
  cityConfig: CityConfig;
}

// 颜色插值函数
const getColor = (value: number, min: number, max: number) => {
  const normalized = (value - min) / (max - min);
  
  if (normalized < 0.2) return '#e0f3f8';
  if (normalized < 0.4) return '#abd9e9';
  if (normalized < 0.6) return '#74add1';
  if (normalized < 0.8) return '#4575b4';
  return '#313695';
};

// 地图控制组件
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

const TrafficMap: React.FC<TrafficMapProps> = ({
  geoJsonData,
  trafficData,
  minTraffic,
  maxTraffic,
  cityType,
  cityConfig,
}) => {
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playSpeed, setPlaySpeed] = useState(1000); // 播放速度（毫秒），默认1秒
  const intervalRef = useRef<number | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  // 根据城市类型获取地图中心和缩放级别
  const mapConfig = CITY_CENTERS[cityType];
  const [mapCenter, setMapCenter] = useState<[number, number]>(mapConfig.center);
  const [mapZoom, setMapZoom] = useState<number>(mapConfig.zoom);

  // 当城市类型改变时，更新地图中心
  useEffect(() => {
    const newConfig = CITY_CENTERS[cityType];
    setMapCenter(newConfig.center);
    setMapZoom(newConfig.zoom);
  }, [cityType]);

  // 获取当前时间点的数据映射
  const getCurrentDataMap = () => {
    const dataMap: Record<string, number> = {};
    if (trafficData[currentTimeIndex]) {
      trafficData[currentTimeIndex].data.forEach(item => {
        dataMap[item.name] = item.value;
      });
    }
    return dataMap;
  };

  // 样式函数
  const style = (feature: any) => {
    const dataMap = getCurrentDataMap();
    // 根据城市配置动态获取地区名称属性
    const districtName = feature.properties[cityConfig.geoJsonPropertyName];
    const value = dataMap[districtName] || 0;
    
    return {
      fillColor: getColor(value, minTraffic, maxTraffic),
      weight: 1.5,
      opacity: 1,
      color: '#ffffff',
      fillOpacity: 0.7,
    };
  };

  // 高亮样式
  const highlightFeature = (e: L.LeafletMouseEvent) => {
    const layer = e.target;
    layer.setStyle({
      weight: 3,
      color: '#ffd700',
      fillOpacity: 0.9,
    });
    layer.bringToFront();
  };

  const resetHighlight = (e: L.LeafletMouseEvent) => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.resetStyle(e.target);
    }
  };

  // 为每个区域添加交互
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const dataMap = getCurrentDataMap();
    // 根据城市配置动态获取地区名称属性
    const districtName = feature.properties[cityConfig.geoJsonPropertyName];
    const value = dataMap[districtName] || 0;

    layer.bindPopup(`
      <div style="padding: 8px;">
        <strong style="font-size: 16px; color: #333;">${districtName}</strong><br/>
        <span style="font-size: 14px; color: #666;">流量: <strong style="color: #1890ff;">${value.toFixed(2)}</strong></span>
      </div>
    `);

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
    });
  };

  // 自动播放
  useEffect(() => {
    if (isPlaying && trafficData.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTimeIndex(prev => (prev + 1) % trafficData.length);
      }, playSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, trafficData.length, playSpeed]);

  // 时间索引变化时更新图层
  useEffect(() => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setStyle(style as any);
    }
  }, [currentTimeIndex]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number) => {
    setCurrentTimeIndex(value);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 地图容器 */}
      <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={mapZoom} />
          {geoJsonData && (
            <GeoJSON
              ref={geoJsonLayerRef as any}
              data={geoJsonData}
              style={style}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>

        {/* 图例 */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: '180px',
        }}>
          <Title level={5} style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
            交通流量
          </Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { color: '#313695', label: '非常高' },
              { color: '#4575b4', label: '高' },
              { color: '#74add1', label: '中等' },
              { color: '#abd9e9', label: '低' },
              { color: '#e0f3f8', label: '很低' },
            ].map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '16px',
                  background: item.color,
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }} />
                <Text style={{ fontSize: '13px' }}>{item.label}</Text>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              范围: {minTraffic.toFixed(1)} - {maxTraffic.toFixed(1)}
            </Text>
          </div>
        </div>
      </div>

      {/* 时间轴控制 */}
      <Card 
        style={{ 
          marginTop: '16px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 播放/暂停按钮 */}
          <div
            onClick={handlePlayPause}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }}
          >
            {isPlaying ? (
              <PauseCircleOutlined style={{ fontSize: '24px', color: '#fff' }} />
            ) : (
              <PlayCircleOutlined style={{ fontSize: '24px', color: '#fff' }} />
            )}
          </div>

          {/* 播放速度控制 */}
          <div style={{ width: '150px' }}>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              播放速度
            </Text>
            <Slider
              min={50}
              max={3000}
              step={200}
              value={playSpeed}
              onChange={setPlaySpeed}
              tooltip={{ 
                formatter: (value) => `${(value! / 1000).toFixed(1)}秒`,
              }}
              marks={{
                50: '0.05s',
                1000: '1s',
                2000: '2s',
                3000: '3s',
              }}
              trackStyle={{ 
                background: '#52c41a',
                height: '4px',
              }}
              handleStyle={{
                width: '16px',
                height: '16px',
                marginTop: '-6px',
                background: '#fff',
                border: '2px solid #52c41a',
              }}
            />
          </div>

          {/* 时间轴滑块 */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '8px',
              alignItems: 'center',
            }}>
              <Text strong style={{ fontSize: '16px', color: '#333' }}>
                {trafficData[currentTimeIndex] ? formatTimestamp(trafficData[currentTimeIndex].timestamp) : ''}
              </Text>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {currentTimeIndex + 1} / {trafficData.length}
              </Text>
            </div>
            <Slider
              min={0}
              max={trafficData.length - 1}
              value={currentTimeIndex}
              onChange={handleSliderChange}
              tooltip={{ 
                formatter: (value) => trafficData[value || 0] ? formatTimestamp(trafficData[value || 0].timestamp) : '',
              }}
              trackStyle={{ 
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                height: '6px',
              }}
              handleStyle={{
                width: '20px',
                height: '20px',
                marginTop: '-7px',
                background: '#fff',
                border: '3px solid #667eea',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              }}
              railStyle={{
                height: '6px',
                background: '#e8e8e8',
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TrafficMap;
