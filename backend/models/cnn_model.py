import torch
import torch.nn as nn
from torchvision import models

class DR_Model(nn.Module):
    def __init__(self, num_classes=5):
        super(DR_Model, self).__init__()
        # Load pre-trained ResNet50
        self.resnet = models.resnet50(pretrained=True)
        # Replace the final fully connected layer
        num_ftrs = self.resnet.fc.in_features
        self.resnet.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_ftrs, num_classes)
        )

    def forward(self, x):
        return self.resnet(x)
