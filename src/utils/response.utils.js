// 성공 응답용
function successResponse(res, message = 'Success', { data }, status = 200) {
  console.log(`data to send:`, data);
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

// 에러 응답용
function errorResponse(res, message = 'Error', data = null, status = 500) {
  return res.status(status).json({
    success: false,
    message,
    data,
  });
}

export { successResponse, errorResponse };
