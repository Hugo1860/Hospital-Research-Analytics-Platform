import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  InputNumber,
  DatePicker,
  Space,
  Row,
  Col,
  message,
  Tooltip,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { publicationAPI } from '../../services/api';
import { formRules } from '../../utils/validators';
import DepartmentSelect from '../common/DepartmentSelect';
import JournalAutoComplete from './JournalAutoComplete';
import { useAuth } from '../../contexts/AuthContext';

const { TextArea } = Input;

interface PublicationFormData {
  title: string;
  authors: string;
  journalId: number;
  journalName?: string;
  departmentId: number;
  publishYear: number;
  publishDate?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string;
  wosNumber?: string;
  documentType?: string;
  journalAbbreviation?: string;
  address?: string;
  keywords?: string;
  abstract?: string;
  notes?: string;
}

interface Journal {
  id: number;
  name: string;
  impactFactor: number;
  quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  category: string;
  issn?: string;
}

interface PublicationFormProps {
  mode?: 'create' | 'edit';
  publicationId?: string;
}

/**
 * 文献录入表单组件
 */
const PublicationForm: React.FC<PublicationFormProps> = ({
  mode = 'create',
  publicationId,
}) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);

  // 选择期刊
  const handleJournalSelect = (journal: Journal) => {
    setSelectedJournal(journal);
    form.setFieldsValue({
      journalId: journal.id,
      journalName: journal.name,
    });
  };

  // 提交表单
  const handleSubmit = async (values: PublicationFormData) => {
    setLoading(true);
    try {
      const submitData = {
        ...values,
        publishDate: values.publishDate ? dayjs(values.publishDate).format('YYYY-MM-DD') : undefined,
        userId: authState.user?.id,
      };

      if (mode === 'edit' && (id || publicationId)) {
        // 更新文献
        await publicationAPI.updatePublication(Number(id || publicationId), submitData);
        message.success('文献更新成功');
      } else {
        // 创建文献
        await publicationAPI.createPublication(submitData);
        message.success('文献录入成功');
      }

      // 跳转到文献列表
      navigate('/publications');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '操作失败，请重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setSelectedJournal(null);
  };

  // 加载文献数据（编辑模式）
  const loadPublicationData = async (publicationId: string) => {
    try {
      // const response = await publicationAPI.getPublication(publicationId);
      // const publication = response.data;
      
      // 模拟数据
      const mockPublication = {
        title: 'Sample Publication Title',
        authors: 'John Doe, Jane Smith',
        journalId: 1,
        journalName: 'Nature',
        departmentId: 1,
        publishYear: 2023,
        publishDate: '2023-06-15',
        volume: '618',
        issue: '7965',
        pages: '123-130',
        doi: '10.1038/s41586-023-06234-6',
        pmid: '37258680',
        keywords: 'research, science, nature',
        abstract: 'This is a sample abstract for the publication.',
        notes: 'Additional notes about the publication.',
      };

      form.setFieldsValue({
        ...mockPublication,
        publishDate: mockPublication.publishDate ? dayjs(mockPublication.publishDate) : undefined,
      });

      // 设置选中的期刊 - 这里需要从实际API获取期刊信息
      // const journal = await journalAPI.getJournal(mockPublication.journalId);
      // if (journal) {
      //   setSelectedJournal(journal.data);
      // }
      
      // 模拟期刊数据
      const mockJournal = {
        id: 1,
        name: 'Nature',
        impactFactor: 49.962,
        quartile: 'Q1' as const,
        category: 'Multidisciplinary Sciences',
        issn: '0028-0836',
      };
      setSelectedJournal(mockJournal);
    } catch (error) {
      message.error('加载文献数据失败');
    }
  };

  // 组件挂载时的初始化
  useEffect(() => {
    // 设置默认值
    if (mode === 'create') {
      form.setFieldsValue({
        publishYear: new Date().getFullYear(),
        departmentId: authState.user?.departmentId,
      });
    }

    // 编辑模式加载数据
    if (mode === 'edit' && (id || publicationId)) {
      loadPublicationData(id || publicationId || '');
    }
  }, [mode, id, publicationId, authState.user]);

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          {mode === 'edit' ? '编辑文献' : '录入文献'}
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button onClick={() => navigate('/publications')}>
            返回列表
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        scrollToFirstError
      >
        <Row gutter={24}>
          {/* 基本信息 */}
          <Col span={24}>
            <Card type="inner" title="基本信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="title"
                    label="文献标题"
                    rules={[
                      formRules.required,
                      { max: 500, message: '标题长度不能超过500个字符' },
                    ]}
                  >
                    <TextArea
                      placeholder="请输入文献标题"
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      showCount
                      maxLength={500}
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="authors"
                    label="作者"
                    rules={[
                      formRules.required,
                      { max: 1000, message: '作者信息长度不能超过1000个字符' },
                    ]}
                  >
                    <TextArea
                      placeholder="请输入作者信息，多个作者用逗号分隔"
                      autoSize={{ minRows: 2, maxRows: 3 }}
                      showCount
                      maxLength={1000}
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="journalId"
                    label={
                      <Space>
                        期刊
                        <Tooltip title="输入期刊名称进行搜索，系统会自动匹配期刊信息">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                    rules={[formRules.required]}
                  >
                    <JournalAutoComplete
                      placeholder="搜索并选择期刊"
                      onJournalSelect={handleJournalSelect}
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="departmentId"
                    label="所属科室"
                    rules={[formRules.required]}
                  >
                    <DepartmentSelect placeholder="请选择所属科室" />
                  </Form.Item>
                </Col>
              </Row>

              {/* 期刊信息展示 */}
              {selectedJournal && (
                <div style={{ 
                  background: '#f6f8fa', 
                  padding: 12, 
                  borderRadius: 6, 
                  marginTop: 16 
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                    选中期刊信息：
                  </div>
                  <Space wrap>
                    <Tag color="blue">{selectedJournal.name}</Tag>
                    <Tag color="green">影响因子: {selectedJournal.impactFactor}</Tag>
                    <Tag color={
                      selectedJournal.quartile === 'Q1' ? 'green' :
                      selectedJournal.quartile === 'Q2' ? 'blue' :
                      selectedJournal.quartile === 'Q3' ? 'orange' : 'red'
                    }>
                      {selectedJournal.quartile}
                    </Tag>
                    <Tag>{selectedJournal.category}</Tag>
                    {selectedJournal.issn && <Tag>ISSN: {selectedJournal.issn}</Tag>}
                  </Space>
                </div>
              )}
            </Card>
          </Col>

          {/* 发表信息 */}
          <Col span={24}>
            <Card type="inner" title="发表信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="publishYear"
                    label="发表年份"
                    rules={[
                      formRules.required,
                      formRules.year,
                    ]}
                  >
                    <InputNumber
                      placeholder="发表年份"
                      min={1900}
                      max={new Date().getFullYear() + 1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="publishDate"
                    label="发表日期"
                  >
                    <DatePicker
                      placeholder="选择发表日期"
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="volume"
                    label="卷号"
                  >
                    <Input placeholder="请输入卷号" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="issue"
                    label="期号"
                  >
                    <Input placeholder="请输入期号" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="pages"
                    label="页码"
                  >
                    <Input placeholder="例如：123-130" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="doi"
                    label="DOI"
                    rules={[
                      {
                        pattern: /^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/,
                        message: 'DOI格式不正确，应以10.开头',
                      },
                    ]}
                  >
                    <Input 
                      placeholder="例如：10.1038/s41586-023-06234-6"
                      onChange={(e) => {
                        const doi = e.target.value;
                        // 自动从DOI推断年份
                        if (doi) {
                          const yearMatch = doi.match(/20\d{2}/);
                          if (yearMatch && !form.getFieldValue('publishYear')) {
                            const year = parseInt(yearMatch[0]);
                            const currentYear = new Date().getFullYear();
                            if (year >= 1900 && year <= currentYear + 1) {
                              form.setFieldsValue({ publishYear: year });
                            }
                          }
                        }
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="pmid"
                    label="PMID"
                    rules={[
                      {
                        pattern: /^\d+$/,
                        message: 'PMID应为纯数字',
                      },
                    ]}
                  >
                    <Input placeholder="请输入PMID" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="wosNumber"
                    label="WOS号"
                  >
                    <Input placeholder="Web of Science号" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="documentType"
                    label="文献类型"
                  >
                    <Input placeholder="例如：Article, Review" />
                  </Form.Item>
                </Col>

                <Col span={8}>
                  <Form.Item
                    name="journalAbbreviation"
                    label="期刊简称"
                  >
                    <Input placeholder="期刊简称" />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="keywords"
                    label="关键词"
                  >
                    <Input placeholder="多个关键词用逗号分隔" />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="address"
                    label="地址信息"
                  >
                    <TextArea
                      placeholder="作者地址信息"
                      autoSize={{ minRows: 2, maxRows: 3 }}
                      showCount
                      maxLength={1000}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 附加信息 */}
          <Col span={24}>
            <Card type="inner" title="附加信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="abstract"
                    label="摘要"
                  >
                    <TextArea
                      placeholder="请输入文献摘要"
                      autoSize={{ minRows: 4, maxRows: 8 }}
                      showCount
                      maxLength={2000}
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="notes"
                    label="备注"
                  >
                    <TextArea
                      placeholder="请输入备注信息"
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      showCount
                      maxLength={500}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 提交按钮 */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space size="large">
            <Button size="large" onClick={() => navigate('/publications')}>
              取消
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
            >
              {mode === 'edit' ? '更新文献' : '保存文献'}
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default PublicationForm;