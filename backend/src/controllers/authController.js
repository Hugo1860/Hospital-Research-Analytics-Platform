const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Department } = require('../models');
const { createError } = require('../middleware/errorHandler');

// 生成JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
};

// 用户注册
const register = async (req, res) => {
  const { username, password, email, role, departmentId } = req.body;

  // 检查用户名是否已存在
  const existingUser = await User.findOne({
    where: { username }
  });

  if (existingUser) {
    throw createError.conflict('用户名已存在');
  }

  // 检查邮箱是否已存在
  const existingEmail = await User.findOne({
    where: { email }
  });

  if (existingEmail) {
    throw createError.conflict('邮箱已被使用');
  }

  // 如果指定了科室，检查科室是否存在
  if (departmentId) {
    const department = await Department.findByPk(departmentId);
    if (!department) {
      throw createError.notFound('指定的科室');
    }
  }

  // 创建用户
  const user = await User.create({
    username,
    password, // 密码会在模型的hook中自动加密
    email,
    role: role || 'user',
    departmentId
  });

  // 获取完整的用户信息（包含科室信息）
  const userWithDepartment = await User.findByPk(user.id, {
    include: [{
      model: Department,
      as: 'department',
      attributes: ['id', 'name', 'code']
    }],
    attributes: { exclude: ['password'] }
  });

  // 生成token
  const token = generateToken(user.id);

  res.status(201).json({
    message: '用户注册成功',
    token,
    user: userWithDepartment
  });
};

// 用户登录
const login = async (req, res) => {
  const { username, password } = req.body;

  // 查找用户（包含科室信息）
  const user = await User.findOne({
    where: { username },
    include: [{
      model: Department,
      as: 'department',
      attributes: ['id', 'name', 'code']
    }]
  });

  if (!user) {
    throw createError.unauthorized('用户名或密码错误');
  }

  // 检查用户是否激活
  if (!user.isActive) {
    throw createError.unauthorized('账户已被禁用，请联系管理员');
  }

  // 验证密码
  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    throw createError.unauthorized('用户名或密码错误');
  }

  // 更新最后登录时间
  await user.updateLastLogin();

  // 生成token
  const token = generateToken(user.id);

  // 返回用户信息（排除密码）
  const userResponse = user.toJSON();

  res.json({
    message: '登录成功',
    token,
    user: userResponse
  });
};

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
  // req.user 由认证中间件设置
  const user = await User.findByPk(req.user.id, {
    include: [{
      model: Department,
      as: 'department',
      attributes: ['id', 'name', 'code']
    }],
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    throw createError.notFound('用户');
  }

  res.json({
    user
  });
};

// 修改密码
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // 验证请求参数
  if (!currentPassword || !newPassword) {
    throw createError.validation('当前密码和新密码都是必填项');
  }

  if (newPassword.length < 6) {
    throw createError.validation('新密码长度至少需要6个字符');
  }

  // 获取当前用户
  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw createError.notFound('用户');
  }

  // 验证当前密码
  const isCurrentPasswordValid = await user.validatePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw createError.unauthorized('当前密码不正确');
  }

  // 更新密码
  await user.update({ password: newPassword });

  res.json({
    message: '密码修改成功'
  });
};

// 刷新token
const refreshToken = async (req, res) => {
  // 生成新的token
  const token = generateToken(req.user.id);

  res.json({
    message: 'Token刷新成功',
    token
  });
};

// 用户登出（客户端处理，服务端记录日志）
const logout = async (req, res) => {
  // 实际的登出逻辑由客户端处理（删除本地token）
  // 这里只是记录登出日志
  res.json({
    message: '登出成功'
  });
};

// 验证token有效性
const verifyToken = async (req, res) => {
  // 如果能到达这里，说明token有效（通过了认证中间件）
  res.json({
    valid: true,
    user: req.user.toJSON()
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword,
  refreshToken,
  logout,
  verifyToken
};