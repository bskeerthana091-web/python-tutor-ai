import torch
import torch.nn as nn
import torch.nn.functional as F

class EncoderLSTM(nn.Module):
    def __init__(self, vocab_size, emb_dim, hidden_size, num_layers=2, dropout=0.5):
        super(EncoderLSTM, self).__init__()
        self.embedding = nn.Embedding(vocab_size, emb_dim)
        # Bidirectional LSTM as requested
        self.lstm = nn.LSTM(emb_dim, hidden_size, num_layers, 
                            dropout=dropout, bidirectional=True, batch_first=True)
        self.dropout = nn.Dropout(dropout)
        
        # Linear layers to resize hidden/cell states since bidirectional doubles the hidden size
        self.fc_hidden = nn.Linear(hidden_size * 2, hidden_size)
        self.fc_cell = nn.Linear(hidden_size * 2, hidden_size)

    def forward(self, src):
        # src shape: (batch_size, seq_length)
        embedded = self.dropout(self.embedding(src)) # (batch_size, seq_length, emb_dim)
        
        # encoder_outputs: (batch_size, seq_length, hidden_size*2)
        encoder_outputs, (hidden, cell) = self.lstm(embedded)
        
        # Resize hidden and cell states for decoder
        # hidden shape is (num_layers * num_directions, batch_size, hidden_size)
        hidden = torch.cat((hidden[0:hidden.size(0):2], hidden[1:hidden.size(0):2]), dim=2)
        cell = torch.cat((cell[0:cell.size(0):2], cell[1:cell.size(0):2]), dim=2)
        
        hidden = self.fc_hidden(hidden)
        cell = self.fc_cell(cell)
        
        return encoder_outputs, hidden, cell

class Attention(nn.Module):
    def __init__(self, hidden_size):
        super(Attention, self).__init__()
        self.attn = nn.Linear(hidden_size * 3, hidden_size)
        self.v = nn.Linear(hidden_size, 1, bias=False)

    def forward(self, hidden, encoder_outputs):
        # hidden = (batch_size, hidden_size)
        # encoder_outputs = (batch_size, seq_len, hidden_size*2)
        
        batch_size = encoder_outputs.shape[0]
        seq_len = encoder_outputs.shape[1]
        
        # Repeat hidden state seq_len times
        hidden = hidden.unsqueeze(1).repeat(1, seq_len, 1) # (batch_size, seq_len, hidden_size)
        
        # Calculate energy
        energy = torch.tanh(self.attn(torch.cat((hidden, encoder_outputs), dim=2))) # (batch_size, seq_len, hidden_size)
        
        # Get attention weights
        attention = self.v(energy).squeeze(2) # (batch_size, seq_len)
        return F.softmax(attention, dim=1)

class DecoderLSTM(nn.Module):
    def __init__(self, vocab_size, emb_dim, hidden_size, num_layers=2, dropout=0.5):
        super(DecoderLSTM, self).__init__()
        self.vocab_size = vocab_size
        self.attention = Attention(hidden_size)
        self.embedding = nn.Embedding(vocab_size, emb_dim)
        
        # Input to LSTM is embedding + weighted encoder outputs (hidden_size * 2)
        self.lstm = nn.LSTM(emb_dim + (hidden_size * 2), hidden_size, num_layers, 
                            dropout=dropout, batch_first=True)
        self.fc_out = nn.Linear(hidden_size + (hidden_size * 2) + emb_dim, vocab_size)
        self.dropout = nn.Dropout(dropout)

    def forward(self, input, hidden, cell, encoder_outputs):
        # input: (batch_size) - one word at a time
        # hidden: (num_layers, batch_size, hidden_size)
        input = input.unsqueeze(1) # (batch_size, 1)
        embedded = self.dropout(self.embedding(input)) # (batch_size, 1, emb_dim)
        
        # Attention uses top layer hidden state
        a = self.attention(hidden[-1], encoder_outputs) # (batch_size, seq_len)
        a = a.unsqueeze(1) # (batch_size, 1, seq_len)
        
        # Weighted sum of encoder outputs
        weighted = torch.bmm(a, encoder_outputs) # (batch_size, 1, hidden_size*2)
        
        lstm_input = torch.cat((embedded, weighted), dim=2) # (batch_size, 1, emb_dim + hidden_size*2)
        
        output, (hidden, cell) = self.lstm(lstm_input, (hidden, cell))
        
        # Combine output, weighted encoder outputs, and embedded input for final prediction
        prediction = self.fc_out(torch.cat((output.squeeze(1), weighted.squeeze(1), embedded.squeeze(1)), dim=1))
        
        return prediction, hidden, cell

class Seq2Seq(nn.Module):
    def __init__(self, encoder, decoder, device):
        super(Seq2Seq, self).__init__()
        self.encoder = encoder
        self.decoder = decoder
        self.device = device
        
    def forward(self, src, trg, teacher_forcing_ratio=0.5):
        # src: (batch_size, src_len)
        # trg: (batch_size, trg_len)
        
        batch_size = src.shape[0]
        trg_len = trg.shape[1]
        trg_vocab_size = self.decoder.vocab_size
        
        outputs = torch.zeros(batch_size, trg_len, trg_vocab_size).to(self.device)
        
        encoder_outputs, hidden, cell = self.encoder(src)
        
        # First input to decoder is SOS token
        input = trg[:, 0]
        
        for t in range(1, trg_len):
            output, hidden, cell = self.decoder(input, hidden, cell, encoder_outputs)
            outputs[:, t, :] = output
            
            # Decide whether to use teacher forcing
            teacher_force = torch.rand(1).item() < teacher_forcing_ratio
            top1 = output.argmax(1) 
            input = trg[:, t] if teacher_force else top1
            
        return outputs
