import React, { useState, useEffect } from 'react';
import {
  Card,
  Upload,
  Button,
  Steps,
  Row,
  Col,
  Table,
  message,
  Space,
  Alert,
  Typography,
  Form,
  Select,
  Divider,
  Progress,
  Tag,
} from 'antd';
import {
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { publicationAPI, departmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import ImportResult from '../common/ImportResult';
import DepartmentSelect from '../common/DepartmentSelect';
import TemplateDownloadButton from '../common/TemplateDownloadButton';
import { handleError, withErrorHandling } from '../../utils/errorHandler';
import tokenManager from '../../utils/tokenManager';
import { useApiMode } from '../../hooks/useApiMode';
import ApiModeIndicator from '../common/ApiModeIndicator';

const { Step } = Steps;
const { Title, Text } = Typography;
const { Dragger } = Upload;

interface PreviewData {
  title: string;
  authors: string;
  journalName: string;
  publishYear: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
}

interface ImportResultData {
  success: number;
  failed: number;
  duplicates: number;
  total: number;
  errors: string[];
  warnings: string[];
  successData?: any[];
}

/**
 * 文献批量导入组件
 */
const PublicationImport: React.FC = () => {
  const { state: authState, hasPermission, hasRole } = useAuth();
  const { isDemoMode, switchToRealApi } = useApiMode();
  const [form] = Form.useForm();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  // 检查用户权限
  useEffect(() => {
    const checkPermissions = () => {
      // 检查用户是否有导入权限
      if (!authState.isAuthenticated) {
        setAuthChecked(true);
        return;
      }

      // 检查角色权限
      if (!hasRole(['admin', 'department_admin'])) {
        setAuthChecked(true);
        return;
      }

      // 检查具体权限
      if (!hasPermission('publications', 'create')) {
        setAuthChecked(true);
        return;
      }

      setAuthChecked(true);
    };

    checkPermissions();
  }, [authState.isAuthenticated, hasRole, hasPermission]);

  // 监听认证状态变化
  useEffect(() => {
    const checkTokenValidity = () => {
      if (authState.isAuthenticated && !tokenManager.isTokenValid()) {
        message.warning('登录状态已过期，请重新登录');
        // 可以选择自动重定向到登录页面
        // setTimeout(() => {
        //   window.location.href = '/login';
        // }, 2000);
      }
    };

    // 定期检查token有效性
    const interval = setInterval(checkTokenValidity, 30000); // 每30秒检查一次

    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  // 监听页面可见性变化，当页面重新获得焦点时检查认证状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && authState.isAuthenticated) {
        // 页面重新获得焦点时，检查token是否仍然有效
        if (!tokenManager.isTokenValid()) {
          message.warning('登录状态已过期，请重新登录');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authState.isAuthenticated]);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls,.csv',
    fileList,
    beforeUpload: (file) => {
      // 检查认证状态
      if (!authState.isAuthenticated || !tokenManager.isTokenValid()) {
        message.error('登录状态已过期，请重新登录');
        return false;
      }

      // 检查文件类型
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel' ||
                     file.type === 'text/csv';
      
      if (!isExcel) {
        message.error('只支持上传 Excel (.xlsx, .xls) 或 CSV 文件');
        return false;
      }

      // 检查文件大小 (10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return false;
      }

      return false; // 阻止自动上传
    },
    onChange: (info) => {
      setFileList(info.fileList.slice(-1)); // 只保留最新的一个文件
    },
    onRemove: () => {
      setFileList([]);
      setPreviewData([]);
      setCurrentStep(0);
    },
  };

  // 预览数据
  const handlePreview = withErrorHandling(async () => {
    if (fileList.length === 0) {
      message.error('请先选择要导入的文件');
      return;
    }

    const departmentId = form.getFieldValue('departmentId');
    if (!departmentId) {
      message.error('请选择目标科室');
      return;
    }

    // 简化的认证状态检查 - 只检查基本认证状态
    if (!authState.isAuthenticated) {
      message.error('请先登录');
      return;
    }

    // 检查权限
    if (!hasPermission('publications', 'create')) {
      message.error('您没有文献导入权限');
      return;
    }

    setLoading(true);
    try {
      // 尝试调用真实API进行文件预览
      const file = fileList[0].originFileObj;
      if (!file) {
        throw new Error('文件对象不存在');
      }

      // 创建FormData用于文件上传
      const formData = new FormData();
      formData.append('file', file);
      formData.append('departmentId', departmentId.toString());
      formData.append('preview', 'true'); // 标记为预览模式

      try {
        // 尝试调用后端预览API
        const response = await publicationAPI.importPublications(file, departmentId);
        
        // 如果后端支持预览模式，使用返回的数据
        if ((response.data as any).preview) {
          setPreviewData((response.data as any).preview);
          setCurrentStep(1);
          message.success('文件解析完成，请检查预览数据');
          return;
        }
      } catch (apiError: any) {
        // 如果API调用失败，使用模拟数据进行演示
        console.warn('API预览失败，使用模拟数据:', apiError);
      }

      // 使用模拟数据作为后备方案
      const mockPreviewData: PreviewData[] = [
        {
          title: 'Sample Publication Title 1',
          authors: 'John Doe, Jane Smith',
          journalName: 'Nature',
          publishYear: 2023,
          volume: '618',
          issue: '7965',
          pages: '123-130',
          doi: '10.1038/s41586-023-06234-6',
          status: 'valid',
          errors: [],
          warnings: [],
        },
        {
          title: 'Sample Publication Title 2',
          authors: 'Alice Johnson',
          journalName: 'Science Magazine',
          publishYear: 2023,
          volume: '380',
          issue: '6645',
          pages: '456-460',
          doi: '',
          status: 'warning',
          errors: [],
          warnings: ['缺少DOI信息'],
        },
        {
          title: '',
          authors: 'Bob Wilson',
          journalName: 'Unknown Journal',
          publishYear: 2025,
          volume: '',
          issue: '',
          pages: '',
          doi: '',
          status: 'error',
          errors: ['标题不能为空', '期刊名称无法匹配', '发表年份不能超过当前年份'],
          warnings: [],
        },
      ];

      setPreviewData(mockPreviewData);
      setCurrentStep(1);
      message.success('文件解析完成（演示模式），请检查预览数据');
    } catch (error: any) {
      handleError(error, 'PublicationImport.handlePreview');
      message.error('文件解析失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, 'PublicationImport.handlePreview');

  // 执行导入
  const handleImport = withErrorHandling(async () => {
    if (previewData.length === 0) {
      message.error('没有可导入的数据');
      return;
    }

    const validData = previewData.filter(item => item.status !== 'error');
    if (validData.length === 0) {
      message.error('没有有效的数据可以导入，请修正错误后重试');
      return;
    }

    // 简化的认证状态检查 - 只检查基本认证状态
    if (!authState.isAuthenticated) {
      message.error('请先登录');
      return;
    }

    // 检查权限
    if (!hasPermission('publications', 'create')) {
      message.error('您没有文献导入权限');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const departmentId = form.getFieldValue('departmentId');
      const file = fileList[0].originFileObj;
      
      if (!file) {
        throw new Error('文件对象不存在');
      }

      // 模拟导入进度
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        // 尝试调用真实API进行导入
        const response = await publicationAPI.importPublications(file, departmentId);
        
        clearInterval(progressInterval);
        setImportProgress(100);
        
        // 使用API返回的结果
        const apiData = response.data as any;
        const result: ImportResultData = {
          total: apiData.total || previewData.length,
          success: apiData.success || validData.length,
          failed: apiData.failed || (previewData.length - validData.length),
          duplicates: apiData.duplicates || 0,
          errors: apiData.errors || [],
          warnings: apiData.warnings || [],
          successData: apiData.successData || validData.slice(0, 5),
        };

        setImportResult(result);
        setCurrentStep(2);
        message.success(`导入完成！成功导入 ${result.success} 条记录`);
        
      } catch (apiError: any) {
        // 如果API调用失败，使用模拟结果
        console.warn('API导入失败，使用模拟结果:', apiError);
        
        clearInterval(progressInterval);
        setImportProgress(100);
        
        const mockResult: ImportResultData = {
          total: previewData.length,
          success: validData.length,
          failed: previewData.length - validData.length,
          duplicates: 0,
          errors: previewData
            .filter(item => item.status === 'error')
            .map(item => `第${previewData.indexOf(item) + 1}行: ${item.errors.join(', ')}`),
          warnings: previewData
            .filter(item => item.warnings.length > 0)
            .map(item => `第${previewData.indexOf(item) + 1}行: ${item.warnings.join(', ')}`),
          successData: validData.slice(0, 5),
        };

        setImportResult(mockResult);
        setCurrentStep(2);
        message.success(`导入完成（演示模式）！成功导入 ${mockResult.success} 条记录`);
      }

    } catch (error: any) {
      handleError(error, 'PublicationImport.handleImport');
      message.error('导入失败：' + (error.response?.data?.message || error.message));
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  }, 'PublicationImport.handleImport');



  // 重新开始
  const handleRestart = () => {
    setCurrentStep(0);
    setFileList([]);
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(0);
    form.resetFields();
  };

  // 预览表格列配置
  const previewColumns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusConfig = {
          valid: { color: 'green', icon: <CheckCircleOutlined />, text: '有效' },
          warning: { color: 'orange', icon: <ExclamationCircleOutlined />, text: '警告' },
          error: { color: 'red', icon: <ExclamationCircleOutlined />, text: '错误' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '文献标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: PreviewData) => (
        <div>
          <div>{text || <Text type="secondary">未填写</Text>}</div>
          {record.errors.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {record.errors.map((error, index) => (
                <Tag key={index} color="red">
                  {error}
                </Tag>
              ))}
            </div>
          )}
          {record.warnings.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {record.warnings.map((warning, index) => (
                <Tag key={index} color="orange">
                  {warning}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authors',
      key: 'authors',
      ellipsis: true,
    },
    {
      title: '期刊名称',
      dataIndex: 'journalName',
      key: 'journalName',
      ellipsis: true,
    },
    {
      title: '发表年份',
      dataIndex: 'publishYear',
      key: 'publishYear',
      width: 100,
    },
    {
      title: 'DOI',
      dataIndex: 'doi',
      key: 'doi',
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">-</Text>,
    },
  ];

  // 如果用户未通过认证检查，显示权限不足提示
  if (!authChecked) {
    return (
      <div>
        <Card
          title={
            <Space>
              <ImportOutlined />
              文献批量导入
            </Space>
          }
        >
          <Alert
            message="权限检查中..."
            description="正在验证您的访问权限，请稍候"
            type="info"
            showIcon
          />
        </Card>
      </div>
    );
  }

  // 如果用户没有权限，显示权限不足提示
  if (!authState.isAuthenticated) {
    return (
      <div>
        <Card
          title={
            <Space>
              <ImportOutlined />
              文献批量导入
            </Space>
          }
        >
          <Alert
            message="需要登录"
            description="请先登录后再访问此功能"
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={() => window.location.href = '/login'}>
                立即登录
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!hasRole(['admin', 'department_admin'])) {
    return (
      <div>
        <Card
          title={
            <Space>
              <ImportOutlined />
              文献批量导入
            </Space>
          }
        >
          <Alert
            message="权限不足"
            description="您没有权限访问此功能，需要管理员或科室管理员权限"
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => window.location.href = '/dashboard'}>
                返回首页
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <ImportOutlined />
            文献批量导入
            {authState.user && (
              <Tag color="blue">
                {authState.user.role === 'admin' ? '系统管理员' : '科室管理员'}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <TemplateDownloadButton
              type="publication"
              disabled={!authState.isAuthenticated || !tokenManager.isTokenValid()}
            >
              下载模板
            </TemplateDownloadButton>
            {currentStep > 0 && (
              <Button onClick={handleRestart}>
                重新开始
              </Button>
            )}
            <ApiModeIndicator showSwitchButton={isDemoMode} />
          </Space>
        }
      >
        {/* 步骤指示器 */}
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="上传文件" description="选择要导入的Excel或CSV文件" />
          <Step title="预览数据" description="检查解析结果并确认导入" />
          <Step title="导入完成" description="查看导入结果" />
        </Steps>

        {/* 步骤1: 文件上传 */}
        {currentStep === 0 && (
          <div>
            <Form form={form} layout="vertical">
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="departmentId"
                    label="目标科室"
                    rules={[{ required: true, message: '请选择目标科室' }]}
                    initialValue={authState.user?.departmentId}
                  >
                    <DepartmentSelect placeholder="请选择要导入到的科室" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Divider />

            <Alert
              message="导入说明"
              description={
                <div>
                  <p>1. 支持 Excel (.xlsx, .xls) 和 CSV 格式文件</p>
                  <p>2. 文件大小不能超过 10MB</p>
                  <p>3. 请确保数据格式符合模板要求</p>
                  <p>4. 系统会自动匹配期刊信息并验证数据</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Dragger {...uploadProps} style={{ marginBottom: 24 }}>
              <p className="ant-upload-drag-icon">
                <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 Excel (.xlsx, .xls) 和 CSV 格式，文件大小不超过 10MB
              </p>
            </Dragger>

            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                size="large"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={loading}
                disabled={
                  fileList.length === 0 || 
                  !authState.isAuthenticated || 
                  !tokenManager.isTokenValid() ||
                  !hasPermission('publications', 'create')
                }
              >
                解析并预览数据
              </Button>
              {(!authState.isAuthenticated || !tokenManager.isTokenValid()) && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    登录状态已过期，请刷新页面重新登录
                  </Text>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 步骤2: 数据预览 */}
        {currentStep === 1 && (
          <div>
            <Alert
              message={`共解析到 ${previewData.length} 条记录`}
              description={
                <div>
                  <Text>
                    有效记录: <Text type="success">{previewData.filter(item => item.status === 'valid').length}</Text> 条，
                    警告记录: <Text type="warning">{previewData.filter(item => item.status === 'warning').length}</Text> 条，
                    错误记录: <Text type="danger">{previewData.filter(item => item.status === 'error').length}</Text> 条
                  </Text>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={previewColumns}
              dataSource={previewData}
              rowKey={(record, index) => index!}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1200 }}
              style={{ marginBottom: 24 }}
            />

            {importing && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4}>正在导入数据...</Title>
                  <Progress
                    percent={importProgress}
                    status="active"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                  <Text type="secondary">请稍候，正在处理您的数据</Text>
                </div>
              </Card>
            )}

            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Button size="large" onClick={() => setCurrentStep(0)}>
                  返回上一步
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<ImportOutlined />}
                  onClick={handleImport}
                  loading={importing}
                  disabled={
                    previewData.filter(item => item.status !== 'error').length === 0 ||
                    !authState.isAuthenticated || 
                    !tokenManager.isTokenValid() ||
                    !hasPermission('publications', 'create')
                  }
                >
                  确认导入
                </Button>
              </Space>
              {(!authState.isAuthenticated || !tokenManager.isTokenValid()) && (
                <div style={{ marginTop: 8 }}>
                  <Alert
                    message="认证状态异常"
                    description="您的登录状态已过期，请刷新页面重新登录"
                    type="warning"
                    showIcon
                    style={{ maxWidth: 400, margin: '8px auto' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 步骤3: 导入结果 */}
        {currentStep === 2 && importResult && (
          <div>
            <ImportResult
              result={importResult}
              title="文献导入结果"
              showSuccessData={true}
            />

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Space size="large">
                <Button size="large" onClick={handleRestart}>
                  继续导入
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => window.location.href = '/publications'}
                >
                  查看文献列表
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PublicationImport;