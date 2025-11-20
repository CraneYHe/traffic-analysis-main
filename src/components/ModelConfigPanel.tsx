import { Form, Select, InputNumber, Button, Card, Upload, Row, Col, Progress } from 'antd';
import { UploadOutlined, DoubleRightOutlined } from '@ant-design/icons';
import type { FormInstance, UploadProps } from 'antd';

const { Option } = Select;

interface ModelConfigPanelProps {
  form: FormInstance;
  maxLength: number;
  uploadProps: UploadProps;
  loading: boolean;
  progress: number;
  connectionTimeout: boolean;
  chromosomeLengths: Record<string, number>;
  onChromosomeChange: (value: string) => void;
  onSubmit: (values: any) => void;
}

const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({
  form,
  maxLength,
  uploadProps,
  loading,
  progress,
  connectionTimeout,
  chromosomeLengths,
  onChromosomeChange,
  onSubmit,
}) => {
  return (
    <Card 
      title="Model Config" 
      style={{ 
        margin: '0px',
        padding: '10px'
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{
          chromosome: 'chr1',
          start: 10000,
          end: 10100,
          batch_size: 32,
          epochs: 100,
          learning_rate: 0.001,
          hidden_layers: 3,
          dropout_rate: 0.2,
        }}
      >
        {/* 1. 训练数据 - 染色体选择 */}
        <Form.Item
          className="bold-form"
          label="Train data"
          name="chromosome"
          rules={[{ required: true, message: 'Select Chromosome' }]}
        >
          <Select placeholder="Select Chromosome" onChange={onChromosomeChange}>
            {Object.keys(chromosomeLengths).map((chr) => (
              <Option key={chr} value={chr}>
                {chr} ({chromosomeLengths[chr].toLocaleString()} bp)
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Start 和 End 区间 */}
        <Row gutter={8}>
          <Col span={12}>
            <Form.Item
              className="bold-form"
              label="Start"
              name="start"
              rules={[
                { required: true, message: 'Input Start Position' },
                {
                  validator: (_, value) => {
                    const endValue = form.getFieldValue('end');
                    if (value !== undefined && endValue !== undefined && (endValue - value) > 100000) {
                      return Promise.reject('End - Start Cannot exceed 100000');
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <InputNumber
                min={0}
                max={maxLength}
                style={{ width: '100%' }}
                placeholder="Start Position"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              className="bold-form"
              label="End"
              name="end"
              rules={[
                { required: true, message: 'Input End Position' },
                {
                  validator: (_, value) => {
                    const startValue = form.getFieldValue('start');
                    if (value !== undefined && startValue !== undefined && (value - startValue) > 100000) {
                      return Promise.reject('End - Start Cannot exceed 100000');
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <InputNumber
                min={0}
                max={maxLength}
                style={{ width: '100%' }}
                placeholder="End Position"
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#000000ff' }}>
          Cell Embedding File
        </div>
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} block>
            Upload File for Cell Embedding
          </Button>
        </Upload>
        <div style={{ margin: '8px', marginTop: '2px', fontSize: '12px', color: '#888' }}>
          file type: .h5ad
        </div>
        
        {/* 进度条 */}
        {loading && (
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <Progress 
              percent={Math.round(progress)} 
              status={progress < 100 ? 'active' : 'success'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#666' }}>
              {progress === 0 
                ? (connectionTimeout ? 'Binning data...' : 'Connecting...') 
                : (progress < 100 
                  ? `Processing Embedding... ${Math.round(progress)}%` 
                  : 'Process Completed!')
              }
            </div>
          </div>
        )}
        
        <Form.Item className="bold-form">
          <Button 
            type="default" 
            htmlType="submit" 
            block
            icon={<DoubleRightOutlined />}
            iconPosition="end"
            className="train-button"
            loading={loading}
          >
            {loading ? 'Predicting...' : 'Start Prediction'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ModelConfigPanel;
