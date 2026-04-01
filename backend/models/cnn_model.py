"""
PyTorch CNN model for Diabetic Retinopathy classification.
Uses ResNet50 with transfer learning from ImageNet.
"""
import torch
import torch.nn as nn
from torchvision import models


class DRClassifier(nn.Module):
    """
    Diabetic Retinopathy classifier built on ResNet50.
    5-class output: No DR, Mild, Moderate, Severe, Proliferative DR
    """

    def __init__(self, num_classes=5, pretrained=True):
        super(DRClassifier, self).__init__()
        # Load pretrained ResNet50
        if pretrained:
            self.backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
        else:
            self.backbone = models.resnet50(weights=None)

        # Store the feature extraction layers for Grad-CAM
        self.features = nn.Sequential(*list(self.backbone.children())[:-2])  # Up to layer4
        self.avgpool = self.backbone.avgpool

        # Replace the final fully-connected layer
        in_features = self.backbone.fc.in_features
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        # Feature extraction
        features = self.features(x)
        pooled = self.avgpool(features)
        pooled = torch.flatten(pooled, 1)
        # Classification
        out = self.classifier(pooled)
        return out

    def get_feature_maps(self, x):
        """Extract feature maps from the last conv layer (for Grad-CAM)."""
        return self.features(x)

    def freeze_backbone(self):
        """Freeze all backbone layers for fine-tuning only the classifier."""
        for param in self.features.parameters():
            param.requires_grad = False

    def unfreeze_backbone(self):
        """Unfreeze all backbone layers for full fine-tuning."""
        for param in self.features.parameters():
            param.requires_grad = True

    @staticmethod
    def load_model(model_path, num_classes=5, device='cpu'):
        """Load a saved model from a .pth file."""
        model = DRClassifier(num_classes=num_classes, pretrained=False)
        state_dict = torch.load(model_path, map_location=device, weights_only=True)
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        return model
