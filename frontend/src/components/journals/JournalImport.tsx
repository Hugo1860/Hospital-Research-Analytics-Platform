import React, { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Steps,
  Result,
  Table,
  Progress,
  Alert,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  message,
  Divider,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { journalAPI } from '../../services/api';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../constants/permissions';
import PermissionButton from '../common/PermissionButton';
import TemplateDownloadButton from '../common/TemplateDownloadButton';
import { useApiMode } from '../../hooks/useApiMode';
import ApiModeIndicator from '../common/ApiModeIndicator';

const { Dragger } = Upload;
const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  total: number;
  errors: string[];
  warnings: string[];
  successData?: any[];
}

interface ImportStep {
  title: string;
  description: string;
  status: 'wait' | 'process' | 'finish' | 'error';
}

/**
 * 期刊数据导入组件
 */
const JournalImport: React.FC = () => {
  const permissions = usePermissions();
  const { isDemoMode, switchToRealApi } = useApiMode();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  // 导入步骤
  const steps: ImportStep[] = [
    {
      title: '上传文件',
      description: '选择并上传期刊数据文件',
      status: currentStep === 0 ? 'process' : currentStep > 0 ? 'finish' : 'wait',
    },
    {
      title: '数据验证',
      description: '验证文件格式和数据完整性',
      status: currentStep === 1 ? 'process' : currentStep > 1 ? 'finish' : 'wait',
    },
    {
      title: '导入处理',
      description: '处理数据并导入到系统',
      status: currentStep === 2 ? 'process' : currentStep > 2 ? 'finish' : 'wait',
    },
    {
      title: '完成',
      description: '导入完成，查看结果',
      status: currentStep === 3 ? 'finish' : 'wait',
    },
  ];

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    beforeUpload: (file: File) => {
      // 文件大小检查 (10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return false;
      }

      // 文件类型检查
      const isValidType = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ].includes(file.type);

      if (!isValidType) {
        message.error('只支持 Excel (.xlsx, .xls) 和 CSV (.csv) 文件');
        return false;
      }

      setUploadedFile(file);
      setCurrentStep(1);
      return false; // 阻止自动上传
    },
    onDrop(e: React.DragEvent<HTMLDivElement>) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  // 开始导入
  const handleStartImport = async () => {
    if (!uploadedFile) {
      message.error('请先上传文件');
      return;
    }

    setUploading(true);
    setCurrentStep(2);
    setImportProgress(0);

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 调用导入API
      // const result = await journalAPI.importJournals(uploadedFile);
      
      // 模拟导入结果
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResult: ImportResult = {
        success: 85,
        failed: 5,
        duplicates: 10,
        total: 100,
        errors: [
          '第3行：影响因子格式错误 (Nature: "abc" 不是有效数字)',
          '第7行：期刊名称为空',
          '第15行：ISSN格式不正确 (应为 XXXX-XXXX 格式)',
          '第23行：分区信息无效 (只支持 Q1, Q2, Q3, Q4)',
          '第31行：出版年份超出范围 (应在 1900-2024 之间)',
        ],
        warnings: [
          '第12行：出版社信息为空，已使用默认值',
          '第18行：学科分类未标准化，已自动匹配',
          '第25行：影响因子过高，请确认数据准确性',
        ],
        successData: [
          { name: 'Nature', impactFactor: 49.962, quartile: 'Q1' },
          { name: 'Science', impactFactor: 47.728, quartile: 'Q1' },
          { name: 'Cell', impactFactor: 41.582, quartile: 'Q1' },
        ],
      };

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(mockResult);
      setCurrentStep(3);
      
      message.success(`导入完成！成功 ${mockResult.success} 条，失败 ${mockResult.failed} 条`);
    } catch (error: any) {
      message.error('导入失败：' + (error.message || '未知错误'));
      setCurrentStep(1); // 回到验证步骤
    } finally {
      setUploading(false);
    }
  };

  // 重新开始
  const handleRestart = () => {
    setCurrentStep(0);
    setUploadedFile(null);
    setImportResult(null);
    setImportProgress(0);
  };



  // 错误信息表格列
  const errorColumns = [
    {
      title: '行号',
      dataIndex: 'row',
      key: 'row',
      width: 80,
      render: (_: any, __: any, index: number) => index + 3, // 假设从第3行开始
    },
    {
      title: '错误类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (text: string) => <Tag color="red">{text}</Tag>,
    },
    {
      title: '错误描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  // 渲染上传步骤
  const renderUploadStep = () => (
    <Card>
      <Row gutter={24}>
        <Col span={12}>
          <Dragger {...uploadProps} style={{ padding: '40px 20px' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式文件
              <br />
              文件大小不超过 10MB
            </p>
          </Dragger>
        </Col>
        <Col span={12}>
          <div style={{ padding: '20px' }}>
            <Title level={4}>导入说明</Title>
            <Paragraph>
              <ul>
                <li>请确保文件包含以下必填字段：期刊名称、影响因子、分区</li>
                <li>可选字段：ISSN、学科分类、出版社、年份</li>
                <li>影响因子应为数字格式</li>
                <li>分区只支持 Q1、Q2、Q3、Q4</li>
                <li>ISSN 格式：XXXX-XXXX</li>
              </ul>
            </Paragraph>
            
            <Divider />
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <TemplateDownloadButton
                type="journal"
                block
              >
                下载导入模板
              </TemplateDownloadButton>
              <Button
                icon={<FileExcelOutlined />}
                type="link"
                onClick={() => window.open('/docs/import-guide.pdf')}
                block
              >
                查看导入指南
              </Button>
            </Space>
          </div>
        </Col>
      </Row>
    </Card>
  );

  // 渲染验证步骤
  const renderValidationStep = () => (
    <Card>
      <Result
        icon={<FileExcelOutlined style={{ color: '#1890ff' }} />}
        title="文件验证"
        subTitle={`已选择文件：${uploadedFile?.name}`}
        extra={[
          <Button key="change" onClick={() => setCurrentStep(0)}>
            重新选择文件
          </Button>,
          <Button key="import" type="primary" onClick={handleStartImport}>
            开始导入
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
          <Alert
            message="文件验证通过"
            description={
              <div>
                <p>文件名：{uploadedFile?.name}</p>
                <p>文件大小：{uploadedFile ? (uploadedFile.size / 1024 / 1024).toFixed(2) : 0} MB</p>
                <p>文件类型：{uploadedFile?.type}</p>
              </div>
            }
            type="success"
            showIcon
          />
        </div>
      </Result>
    </Card>
  );

  // 渲染导入进度步骤
  const renderImportStep = () => (
    <Card>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Title level={3}>正在导入数据...</Title>
        <Progress
          type="circle"
          percent={importProgress}
          status={uploading ? 'active' : 'success'}
          style={{ marginBottom: 24 }}
        />
        <Paragraph>
          请耐心等待，正在处理您的数据文件
        </Paragraph>
      </div>
    </Card>
  );

  // 渲染完成步骤
  const renderCompleteStep = () => (
    <div>
      {importResult && (
        <>
          {/* 导入结果统计 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总记录数"
                  value={importResult.total}
                  prefix={<FileExcelOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="成功导入"
                  value={importResult.success}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="导入失败"
                  value={importResult.failed}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="重复记录"
                  value={importResult.duplicates}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 错误信息 */}
          {importResult.errors.length > 0 && (
            <Card title="错误详情" style={{ marginBottom: 16 }}>
              <Alert
                message={`发现 ${importResult.errors.length} 个错误`}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <List
                size="small"
                dataSource={importResult.errors}
                renderItem={(error, index) => (
                  <List.Item>
                    <Text type="danger">{index + 1}. {error}</Text>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 警告信息 */}
          {importResult.warnings.length > 0 && (
            <Card title="警告信息" style={{ marginBottom: 16 }}>
              <Alert
                message={`发现 ${importResult.warnings.length} 个警告`}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <List
                size="small"
                dataSource={importResult.warnings}
                renderItem={(warning, index) => (
                  <List.Item>
                    <Text type="warning">{index + 1}. {warning}</Text>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 操作按钮 */}
          <Card>
            <Space>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleRestart}
              >
                重新导入
              </Button>
              <PermissionButton
                permissions={[PERMISSIONS.JOURNAL_READ]}
                onClick={() => window.location.href = '/journals'}
              >
                查看期刊列表
              </PermissionButton>
            </Space>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div>
      <Card 
        title="期刊数据导入" 
        style={{ marginBottom: 24 }}
        extra={<ApiModeIndicator showSwitchButton={isDemoMode} />}
      >
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              status={step.status}
            />
          ))}
        </Steps>

        {currentStep === 0 && renderUploadStep()}
        {currentStep === 1 && renderValidationStep()}
        {currentStep === 2 && renderImportStep()}
        {currentStep === 3 && renderCompleteStep()}
      </Card>
    </div>
  );
};

export default JournalImport;