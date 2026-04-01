"""
Grad-CAM visualization service.
Generates heatmap overlays showing which regions of the retinal image
influenced the model's prediction most.
"""
import os
import uuid
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.cm as cm

from models.cnn_model import DRClassifier
from utils.preprocessing import get_inference_transform
from config import Config


class GradCAM:
    """
    Grad-CAM implementation for DRClassifier.
    Hooks into the last convolutional layer to extract gradients and feature maps.
    """

    def __init__(self, model, target_layer=None):
        self.model = model
        self.model.eval()
        self.gradients = None
        self.activations = None

        # Default target layer: last conv block of ResNet (layer4)
        if target_layer is None:
            target_layer = model.features[-1]

        # Register hooks
        target_layer.register_forward_hook(self._forward_hook)
        target_layer.register_full_backward_hook(self._backward_hook)

    def _forward_hook(self, module, input, output):
        self.activations = output.detach()

    def _backward_hook(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, input_tensor, target_class=None):
        """
        Generate Grad-CAM heatmap for the given input.
        Returns numpy array (H, W) with values in [0, 1].
        """
        self.model.eval()
        # Enable gradients for Grad-CAM computation
        input_tensor.requires_grad_(True)

        # Forward pass
        output = self.model(input_tensor)

        if target_class is None:
            target_class = output.argmax(dim=1).item()

        # Backward pass for target class
        self.model.zero_grad()
        target = output[0, target_class]
        target.backward()

        # Get gradients and activations
        gradients = self.gradients[0]  # (C, H, W)
        activations = self.activations[0]  # (C, H, W)

        # Global average pooling of gradients
        weights = gradients.mean(dim=(1, 2))  # (C,)

        # Weighted sum of activation maps
        cam = torch.zeros(activations.shape[1:], device=activations.device)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        # ReLU and normalize
        cam = F.relu(cam)
        if cam.max() > 0:
            cam = cam / cam.max()

        return cam.cpu().numpy()


def generate_heatmap(image_path, model, predicted_class=None):
    """
    Generate and save a Grad-CAM heatmap overlay image.
    Returns the path to the saved heatmap image.
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Load and preprocess
    transform = get_inference_transform(Config.IMAGE_SIZE)
    original_image = Image.open(image_path).convert('RGB')
    input_tensor = transform(original_image).unsqueeze(0).to(device)

    # Generate Grad-CAM
    grad_cam = GradCAM(model)
    heatmap = grad_cam.generate(input_tensor, target_class=predicted_class)

    # Resize heatmap to original image size
    original_np = np.array(original_image.resize((Config.IMAGE_SIZE, Config.IMAGE_SIZE)))
    heatmap_resized = np.uint8(255 * heatmap)
    heatmap_resized = np.array(
        Image.fromarray(heatmap_resized).resize(
            (original_np.shape[1], original_np.shape[0]),
            resample=Image.BILINEAR,
        )
    )

    # Apply colormap
    colormap = cm.jet(heatmap_resized / 255.0)[:, :, :3]  # Drop alpha
    colormap = np.uint8(colormap * 255)

    # Overlay heatmap on original image
    overlay = np.uint8(0.6 * original_np + 0.4 * colormap)

    # Save the heatmap image
    heatmap_filename = f"heatmap_{uuid.uuid4().hex[:8]}.png"
    heatmap_path = os.path.join(Config.HEATMAP_FOLDER, heatmap_filename)

    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    axes[0].imshow(original_np)
    axes[0].set_title('Original Image', fontsize=12, fontweight='bold')
    axes[0].axis('off')

    axes[1].imshow(heatmap_resized, cmap='jet')
    axes[1].set_title('Attention Heatmap', fontsize=12, fontweight='bold')
    axes[1].axis('off')

    axes[2].imshow(overlay)
    axes[2].set_title('Overlay', fontsize=12, fontweight='bold')
    axes[2].axis('off')

    plt.tight_layout()
    plt.savefig(heatmap_path, dpi=100, bbox_inches='tight', facecolor='white')
    plt.close(fig)

    return heatmap_path
