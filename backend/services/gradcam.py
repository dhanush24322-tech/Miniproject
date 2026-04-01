import cv2
import numpy as np
import torch
from PIL import Image

def generate_gradcam(model, input_tensor, original_image_path, output_path):
    """
    Generate a Grad-CAM heatmap highlighting regions used for diagnosis.
    """
    model.eval()
    
    # Target the last convolutional layer of ResNet50
    target_layer = model.resnet.layer4[-1]
    
    activations = []
    gradients = []
    
    def forward_hook(module, input, output):
        activations.append(output)
    
    def backward_hook(module, grad_input, grad_output):
        gradients.append(grad_output[0])
    
    # Register hooks
    h1 = target_layer.register_forward_hook(forward_hook)
    h2 = target_layer.register_full_backward_hook(backward_hook)
    
    # Forward pass
    output = model(input_tensor)
    _, predicted = torch.max(output, 1)
    
    # Backward pass
    model.zero_grad()
    score = output[0, predicted]
    score.backward()
    
    # Extract data from hooks
    grads = gradients[0].cpu().data.numpy()[0]
    acts = activations[0].cpu().data.numpy()[0]
    
    # Remove hooks
    h1.remove()
    h2.remove()
    
    # Compute Weights and Heatmap
    weights = np.mean(grads, axis=(1, 2))
    cam = np.zeros(acts.shape[1:], dtype=np.float32)
    
    for i, w in enumerate(weights):
        cam += w * acts[i, :, :]
        
    cam = np.maximum(cam, 0)
    cam = cv2.resize(cam, (224, 224))
    cam = cam - np.min(cam)
    cam = cam / np.max(cam)
    
    # Overlay on original image
    img = cv2.imread(original_image_path)
    img = cv2.resize(img, (224, 224))
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    overlayed = cv2.addWeighted(img, 0.6, heatmap, 0.4, 0)
    
    cv2.imwrite(output_path, overlayed)
    return output_path
