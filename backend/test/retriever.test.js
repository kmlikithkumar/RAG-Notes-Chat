const { fuseRRF, scoreBM25 } = require('../src/retriever');

describe('retriever.js', () => {
  describe('fuseRRF', () => {
    it('should combine dense and bm25 lists correctly', () => {
      const dense = [{ id: 'A', score: 0.9 }, { id: 'B', score: 0.8 }];
      const bm25 = [{ id: 'B', score: 2.5 }, { id: 'C', score: 1.5 }];
      
      const result = fuseRRF(dense, bm25, 3);
      expect(result.length).toBe(3);
      expect(result[0].id).toBe('B'); // B is in both lists, gets highest RRF
      expect(result[1].id).toBe('A');
      expect(result[2].id).toBe('C');
    });
  });

  describe('scoreBM25', () => {
    it('should rank chunks containing query terms higher', () => {
      const chunks = [
        { id: '1', text: 'apple banana orange' },
        { id: '2', text: 'grape kiwi' },
        { id: '3', text: 'apple apple apple' }
      ];
      
      const ranked = scoreBM25('apple', chunks);
      expect(ranked[0].id).toBe('3'); // 3 apples
      expect(ranked[1].id).toBe('1'); // 1 apple
      expect(ranked.findIndex(c => c.id === '2')).toBe(-1); // no apples, score is 0
    });
  });
});
