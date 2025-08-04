import React, { useState, useEffect } from 'react';
import { Select, SelectProps } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { departmentAPI } from '../../services/api';

const { Option } = Select;

interface Department {
  id: number;
  name: string;
  code: string;
}

interface DepartmentSelectProps extends Omit<SelectProps, 'children'> {
  onDepartmentsLoad?: (departments: Department[]) => void;
}

/**
 * 科室选择组件
 */
const DepartmentSelect: React.FC<DepartmentSelectProps> = ({
  onDepartmentsLoad,
  ...selectProps
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载科室列表
  const loadDepartments = async () => {
    if (departments.length > 0) return; // 避免重复加载
    
    setLoading(true);
    try {
      const response = await departmentAPI.getDepartments();
      const deptList = response.data.data || [];
      setDepartments(deptList);
      
      if (onDepartmentsLoad) {
        onDepartmentsLoad(deptList);
      }
    } catch (error) {
      // 如果API调用失败，使用模拟数据
      const mockDepartments = [
        { id: 1, name: '内科', code: 'NK' },
        { id: 2, name: '外科', code: 'WK' },
        { id: 3, name: '儿科', code: 'EK' },
        { id: 4, name: '妇产科', code: 'FCK' },
        { id: 5, name: '急诊科', code: 'JZK' },
        { id: 6, name: '影像科', code: 'YXK' },
        { id: 7, name: '检验科', code: 'JYK' },
        { id: 8, name: '药剂科', code: 'YJK' },
        { id: 9, name: '心内科', code: 'XNK' },
        { id: 10, name: '神经科', code: 'SJK' },
      ];
      setDepartments(mockDepartments);
      
      if (onDepartmentsLoad) {
        onDepartmentsLoad(mockDepartments);
      }
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载科室列表
  useEffect(() => {
    loadDepartments();
  }, []);

  return (
    <Select
      {...selectProps}
      loading={loading}
      onFocus={loadDepartments}
      showSearch
      filterOption={(input, option) =>
        (option?.children as unknown as string)
          ?.toLowerCase()
          .includes(input.toLowerCase())
      }
    >
      {departments.map((dept) => (
        <Option key={dept.id} value={dept.id}>
          <TeamOutlined style={{ marginRight: 8 }} />
          {dept.name}
        </Option>
      ))}
    </Select>
  );
};

export default DepartmentSelect;