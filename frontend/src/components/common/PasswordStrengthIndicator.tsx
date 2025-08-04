import React from 'react';
import { Progress, Typography } from 'antd';
import { checkPasswordStrength } from '../../utils/userValidation';

const { Text } = Typography;

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

/**
 * 密码强度指示器组件
 */
const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showFeedback = true,
}) => {
  if (!password) return null;

  const { score, feedback, isStrong } = checkPasswordStrength(password);
  
  const getStrengthColor = () => {
    if (score <= 1) return '#ff4d4f';
    if (score <= 2) return '#faad14';
    if (score <= 3) return '#1890ff';
    return '#52c41a';
  };

  const getStrengthText = () => {
    if (score <= 1) return '弱';
    if (score <= 2) return '一般';
    if (score <= 3) return '良好';
    return '强';
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, marginRight: 8 }}>密码强度:</Text>
        <Progress
          percent={(score / 5) * 100}
          size="small"
          strokeColor={getStrengthColor()}
          showInfo={false}
          style={{ flex: 1, marginRight: 8 }}
        />
        <Text
          style={{
            fontSize: 12,
            color: getStrengthColor(),
            fontWeight: 'bold',
          }}
        >
          {getStrengthText()}
        </Text>
      </div>
      
      {showFeedback && feedback.length > 0 && (
        <div style={{ fontSize: 12, color: '#666' }}>
          <Text type="secondary">建议: {feedback.join('、')}</Text>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;