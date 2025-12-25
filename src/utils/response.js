// 성공 응답용
export const successResponse = (res, message = 'Success', data, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

// 에러 응답용
export const errorResponse = (res, message = 'Error', data = null, status = 500) => {
  return res.status(status).json({
    success: false,
    message,
    data,
  });
};
