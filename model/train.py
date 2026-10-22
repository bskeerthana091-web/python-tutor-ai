import json
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import matplotlib.pyplot as plt
from model import EncoderLSTM, DecoderLSTM, Seq2Seq

# Hyperparameters
EPOCHS = 50
BATCH_SIZE = 32
EMB_DIM = 256
HIDDEN_SIZE = 512
NUM_LAYERS = 2
DROPOUT = 0.5
LEARNING_RATE = 0.001
MAX_LENGTH = 100
CLIP = 1.0

class PythonQADataset(Dataset):
    def __init__(self, data_path, vocab_path):
        with open(data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
            
        with open(vocab_path, 'r', encoding='utf-8') as f:
            vocab_data = json.load(f)
            self.word2idx = vocab_data['word2idx']
            self.idx2word = {int(k): v for k, v in vocab_data['idx2word'].items()}
            
        self.vocab_size = len(self.word2idx)
        
    def __len__(self):
        return len(self.data)
        
    def text_to_indices(self, text):
        from build_vocab import tokenize
        tokens = tokenize(text)
        indices = [self.word2idx.get('<SOS>')]
        for token in tokens[:MAX_LENGTH-2]:
            indices.append(self.word2idx.get(token, self.word2idx.get('<UNK>')))
        indices.append(self.word2idx.get('<EOS>'))
        
        # Pad sequence
        while len(indices) < MAX_LENGTH:
            indices.append(self.word2idx.get('<PAD>'))
            
        return torch.tensor(indices, dtype=torch.long)
        
    def __getitem__(self, idx):
        item = self.data[idx]
        src = self.text_to_indices(item['question'])
        trg = self.text_to_indices(item['answer'])
        return src, trg

def train():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(os.path.dirname(base_dir), 'data')
    data_path = os.path.join(data_dir, 'cleaned_dataset.json')
    vocab_path = os.path.join(base_dir, 'vocabulary.json')
    
    if not os.path.exists(data_path) or not os.path.exists(vocab_path):
        print("Data or vocabulary missing. Please run collect_data.py, clean_data.py, and build_vocab.py first.")
        return
        
    print("Loading dataset...")
    dataset = PythonQADataset(data_path, vocab_path)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    vocab_size = dataset.vocab_size
    pad_idx = dataset.word2idx['<PAD>']
    
    print("Initializing model...")
    encoder = EncoderLSTM(vocab_size, EMB_DIM, HIDDEN_SIZE, NUM_LAYERS, DROPOUT)
    decoder = DecoderLSTM(vocab_size, EMB_DIM, HIDDEN_SIZE, NUM_LAYERS, DROPOUT)
    model = Seq2Seq(encoder, decoder, device).to(device)
    
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    criterion = nn.CrossEntropyLoss(ignore_index=pad_idx)
    
    best_loss = float('inf')
    loss_history = []
    
    print(f"Starting training for {EPOCHS} epochs...")
    for epoch in range(EPOCHS):
        model.train()
        epoch_loss = 0
        
        for i, (src, trg) in enumerate(dataloader):
            src, trg = src.to(device), trg.to(device)
            
            optimizer.zero_grad()
            
            # Forward pass
            output = model(src, trg)
            
            # output: (batch_size, trg_len, vocab_size) -> (batch_size * trg_len, vocab_size)
            # trg: (batch_size, trg_len) -> (batch_size * trg_len)
            output_dim = output.shape[-1]
            output = output[1:].view(-1, output_dim)
            trg = trg[1:].view(-1)
            
            loss = criterion(output, trg)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), CLIP)
            
            optimizer.step()
            epoch_loss += loss.item()
            
            if i % 100 == 0:
                print(f"Epoch [{epoch+1}/{EPOCHS}], Step [{i}/{len(dataloader)}], Loss: {loss.item():.4f}")
                
        avg_loss = epoch_loss / len(dataloader)
        loss_history.append(avg_loss)
        print(f"Epoch {epoch+1} completed. Average Loss: {avg_loss:.4f}")
        
        # Save best model
        if avg_loss < best_loss:
            best_loss = avg_loss
            save_path = os.path.join(base_dir, 'best_model.pth')
            torch.save(model.state_dict(), save_path)
            print(f"Saved new best model with loss {best_loss:.4f} to {save_path}")
            
    print("Training complete!")
    
    # Plotting training loss
    plt.figure(figsize=(10, 5))
    plt.plot(range(1, EPOCHS+1), loss_history, label='Training Loss')
    plt.xlabel('Epochs')
    ylabel = 'Loss'
    plt.ylabel(ylabel)
    plt.title('Training Loss over Epochs')
    plt.legend()
    plot_path = os.path.join(base_dir, 'training_loss.png')
    plt.savefig(plot_path)
    print(f"Loss plot saved to {plot_path}")

if __name__ == '__main__':
    train()
