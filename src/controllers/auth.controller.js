// auth.controller.js
const prisma = require('./src/prismaClient'); // 위에서 만든 파일 불러오기
const auth = require('../utils/password.utils');
const jwttoken = require('../utils/jwttoken.utils');
// const { getIo } = require('../websocket');
/*
로그인, 회원가입 로직
*/

// 회원가입
exports.register = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        username,
        password: await auth.hashPassword(password),
      },
    });
    res.status(201).json({ message: 'User registered successfully', userId: user.userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 가져오기
exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        userId: true,
        username: true,
        teamId: true,
      },
    });
    res.status(200).json({ message: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

//
exports.getMe = async (req, res) => {
  const { userId } = req.user;
  try {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        username: true,
        teamId: true,
      },
    });
    res.status(200).json({ message: user });
  } catch (err) {
    console.error('GetMe 에러:', err);
    res.status(500).json({ message: '서버 에러' });
  }
};
