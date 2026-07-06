const { chunkText } = require('../src/chunk');

describe('chunkText', () => {
  it('should return empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('should chunk text smaller than max size into one chunk', () => {
    const text = 'Hello world';
    const chunks = chunkText(text);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('Hello world');
  });

  it('should split long text with overlap', () => {
    const text = new Array(200).fill('word').join(' ');
    const chunks = chunkText(text, { chunkSize: 180, overlap: 30 });
    expect(chunks.length).toBe(2);
    expect(chunks[0].split(' ').length).toBe(180);
    expect(chunks[1].split(' ').length).toBe(50);
  });
});
