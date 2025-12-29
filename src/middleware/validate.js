export const validateBody = (schema) => (req, res, next) => {
  console.log('Validating request body against schema:', schema);
  console.log('Request body:', req.body);
  // safeParse는 에러를 throw하지 않고 success 여부를 반환합니다.
  const result = schema.safeParse(req.body);
  console.log('Body validation result:', result);

  if (!result.success) {
    // 에러 메시지만 깔끔하게 포맷팅해서 보냄
    // flatten()은 에러를 { fieldErrors: { ... }, formErrors: [] } 형태로 정리해줍니다.
    return res.status(400).json({
      status: 400,
      message: '유효성 검사 실패',
      errors: result.error.flatten().fieldErrors,
    });
  }

  // 검증된(그리고 변환된) 데이터를 req.body에 덮어씌웁니다.
  // 예: age가 "20" 문자열로 왔어도 20 숫자로 변환되어 들어감
  req.body = result.data;
  next();
};

export const validateToken = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.user);
  console.log('Token validation result:', result);

  if (!result.success) {
    return res.status(400).json({
      status: 400,
      message: '토큰 유효성 검사 실패',
      errors: result.error.flatten().fieldErrors,
    });
  }
  req.user = result.data;
  next();
};
