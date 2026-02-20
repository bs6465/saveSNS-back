import { describe, it, expect } from 'vitest';
import { analyzeKeywords } from '../../../src/services/urgencyAnalyzer.service.js';

describe('analyzeKeywords', () => {
  it('자연재해 키워드를 감지한다', () => {
    const result = analyzeKeywords('우리 동네에 폭우가 심하게 내리고 있어요. 침수 위험!');
    expect(result.score).toBeGreaterThan(0);
    expect(result.category).toBe('naturalDisaster');
    expect(result.matchedKeywords).toContain('폭우');
    expect(result.matchedKeywords).toContain('침수');
  });

  it('사고 키워드를 감지한다', () => {
    const result = analyzeKeywords('앞 건물에서 화재 발생! 폭발 소리도 들렸어요');
    expect(result.score).toBeGreaterThan(0);
    expect(result.category).toBe('accident');
    expect(result.matchedKeywords).toContain('화재');
    expect(result.matchedKeywords).toContain('폭발');
  });

  it('생활안전 키워드를 감지한다', () => {
    const result = analyzeKeywords('이 근처 싱크홀 발견! 도로 통제 중입니다');
    expect(result.score).toBeGreaterThan(0);
    expect(result.category).toBe('lifeSafety');
    expect(result.matchedKeywords).toContain('싱크홀');
    expect(result.matchedKeywords).toContain('통제');
  });

  it('건강/의료 키워드를 감지한다', () => {
    const result = analyzeKeywords('근처 공장에서 유독 가스가 누출되고 있습니다');
    expect(result.score).toBeGreaterThan(0);
    expect(result.matchedKeywords).toContain('유독');
  });

  it('키워드가 없는 일반 글은 score 0을 반환한다', () => {
    const result = analyzeKeywords('오늘 날씨가 좋아서 산책했어요');
    expect(result.score).toBe(0);
    expect(result.category).toBeNull();
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it('복수 키워드 매칭 시 보너스 점수가 추가된다', () => {
    const single = analyzeKeywords('미세먼지가 심합니다');
    const multi = analyzeKeywords('미세먼지가 심하고 황사도 있어요');
    expect(multi.score).toBeGreaterThan(single.score);
    expect(multi.matchedKeywords.length).toBeGreaterThan(single.matchedKeywords.length);
  });

  it('가장 높은 가중치 카테고리를 선택한다', () => {
    // 자연재해(weight 1.0) 키워드 + 생활안전(weight 0.7) 키워드
    const result = analyzeKeywords('지진 발생으로 대피해야 합니다');
    expect(result.category).toBe('naturalDisaster');
  });

  it('최대 점수가 10을 초과하지 않는다', () => {
    const result = analyzeKeywords('지진 해일 태풍 폭우 산사태 침수 폭발 화재 붕괴 대피');
    expect(result.score).toBeLessThanOrEqual(10);
  });
});
