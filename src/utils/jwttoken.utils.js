import { jwt } from 'jsonwebtoken';

// 토큰 생성 및 업데이트
function generateToken(user) {
  const payload = {
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
  };

  const secretKey = process.env.JWT_SECRET_KEY;
  const options = { expiresIn: '3h' };

  return jwt.sign(payload, secretKey, options);
}

// 이 함수를 다른 파일에서 쓸 수 있도록 export 합니다.
module.exports = {
  generateToken,
};
