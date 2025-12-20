import argon2 from 'argon2';
// const argon2 = require('argon2');

// Argon2 옵션 설정 (DevOps 관점에서 서버 스펙에 맞춰 튜닝하는 부분)
const options = {
  type: argon2.argon2id, // [중요] GPU 공격과 사이드 채널 공격을 모두 막는 가장 강력한 타입
  memoryCost: 2 ** 16, // 메모리 사용량: 64MB (2^16 KB). 라즈베리파이 등에서는 조절 필요
  timeCost: 3, // 연산 반복 횟수 (CPU 부하에 영향)
  parallelism: 1, // 병렬 처리에 사용할 스레드 수
};

/**
 * 1. 비밀번호를 해시화하는 함수
 */
async function hashPassword(plainPassword) {
  try {
    // bcrypt와 달리 두 번째 인자에 객체 형태의 옵션을 넣습니다.
    const hash = await argon2.hash(plainPassword, options);
    return hash;
  } catch (err) {
    console.error('Hashing error:', err);
    throw new Error('Error hashing password');
  }
}

/**
 * 2. 원본 비밀번호와 해시된 비밀번호를 비교하는 함수
 */
async function comparePassword(plainPassword, hashedPassword) {
  try {
    // ★ 주의: bcrypt.compare(plain, hash)와 인자 순서가 반대입니다!
    // argon2.verify(저장된_해시값, 입력받은_평문) 순서여야 합니다.
    const isMatch = await argon2.verify(hashedPassword, plainPassword);
    return isMatch;
  } catch (err) {
    console.error('Comparison error:', err);
    return false;
  }
}

export default {
  hashPassword,
  comparePassword,
};
