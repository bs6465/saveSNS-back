const jwt = require('jsonwebtoken');

/*
JWT 토큰을 바탕으로 user_id, username 가져오기
auth.controller.js 의 getMe 부분과 auth.routes.js의 getMe 참조
*/

exports.verifyToken = (req, res, next) => {
  // 헤더에서 토큰 가져오기
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 'Bearer ' 제거

  if (token == null) {
    return res.status(401).json({ message: '토큰이 없습니다.' });
  }

  // 토큰 검증
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }

    // 토큰이 유효하면 req.user에 사용자 정보 저장
    req.user = user;
    next(); // 다음 미들웨어 또는 라우터 핸들러로 이동
  });
};

// 로그인(인증) 여부만 확인하는 미들웨어 (verifyToken 후에 사용)
exports.checkAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: '인증 정보가 없습니다. (토큰 누락 또는 만료)' });
  }
  // 인증 통과!
  next();
};
