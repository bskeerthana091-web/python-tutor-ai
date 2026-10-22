import json
import os
import re
from collections import Counter

MAX_VOCAB_SIZE = 10000
PAD_TOKEN = "<PAD>"
UNK_TOKEN = "<UNK>"
SOS_TOKEN = "<SOS>"
EOS_TOKEN = "<EOS>"

def tokenize(text):
    # Simple whitespace and punctuation tokenizer
    text = text.lower()
    text = re.sub(r"([?.!,¿'\"()[\]{}])", r" \1 ", text)
    text = re.sub(r'[" "]+', " ", text)
    return text.strip().split()

def build_vocabulary(input_path, output_path):
    print(f"Loading cleaned dataset from {input_path}...")
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {input_path} not found. Run clean_data.py first.")
        return

    word_freq = Counter()
    
    print("Tokenizing and counting words...")
    for item in data:
        q_tokens = tokenize(item.get('question', ''))
        a_tokens = tokenize(item.get('answer', ''))
        word_freq.update(q_tokens)
        word_freq.update(a_tokens)
        
    print(f"Total unique words found: {len(word_freq)}")
    
    # Keep top words up to MAX_VOCAB_SIZE minus special tokens
    top_words = word_freq.most_common(MAX_VOCAB_SIZE - 4)
    
    vocab2index = {
        PAD_TOKEN: 0,
        UNK_TOKEN: 1,
        SOS_TOKEN: 2,
        EOS_TOKEN: 3
    }
    
    for idx, (word, freq) in enumerate(top_words, start=4):
        vocab2index[word] = idx
        
    index2vocab = {idx: word for word, idx in vocab2index.items()}
    
    vocab_data = {
        'word2idx': vocab2index,
        'idx2word': index2vocab
    }
    
    print(f"Final vocabulary size: {len(vocab2index)}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(vocab_data, f, indent=2)
        
    print(f"Vocabulary saved to {output_path}")

if __name__ == '__main__':
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(os.path.dirname(base_dir), 'data')
    input_file = os.path.join(data_dir, 'cleaned_dataset.json')
    output_file = os.path.join(base_dir, 'vocabulary.json')
    
    build_vocabulary(input_file, output_file)
