"""
Image preprocessing utilities for training and inference.
Includes data augmentation, normalization, and custom dataset class.
"""
import os
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms


# ImageNet normalization stats
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_train_transforms(image_size=224):
    """Training transforms with data augmentation."""
    return transforms.Compose([
        transforms.Resize((image_size + 32, image_size + 32)),
        transforms.RandomCrop(image_size),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_val_transforms(image_size=224):
    """Validation/inference transforms (no augmentation)."""
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_inference_transform(image_size=224):
    """Single image transform for prediction."""
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


class RetinalDataset(Dataset):
    """
    Custom dataset for retinal fundus images.
    Expects folder structure:
        dataset_root/
        ├── 0_No_DR/
        ├── 1_Mild/
        ├── 2_Moderate/
        ├── 3_Severe/
        └── 4_Proliferative_DR/
    """

    CLASS_NAMES = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR']
    VALID_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.tiff', '.bmp'}

    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.samples = []  # List of (image_path, label)
        self.class_counts = {}

        self._load_samples()

    def _load_samples(self):
        """Scan the directory structure and load image paths with labels."""
        if not os.path.isdir(self.root_dir):
            return

        JUNK_DIRS = {'__MACOSX', '.DS_Store', '__pycache__', '.git'}

        # Look for class subdirectories
        subdirs = sorted([
            d for d in os.listdir(self.root_dir)
            if os.path.isdir(os.path.join(self.root_dir, d)) and d not in JUNK_DIRS
        ])

        # Map folder names to class indices — try multiple strategies
        class_map = {}

        # Strategy 1: digit prefix (e.g., "0_No_DR" → 0)
        for subdir in subdirs:
            parts = subdir.split('_', 1)
            try:
                idx = int(parts[0])
                if 0 <= idx < len(self.CLASS_NAMES):
                    class_map[subdir] = idx
            except (ValueError, IndexError):
                pass

        # Strategy 2: numeric-only folders (e.g., "0", "1", "2")
        if not class_map:
            for subdir in subdirs:
                try:
                    idx = int(subdir)
                    if 0 <= idx < len(self.CLASS_NAMES):
                        class_map[subdir] = idx
                except ValueError:
                    pass

        # Strategy 3: keyword matching (e.g., "No_DR" → 0, "Mild" → 1, etc.)
        if not class_map:
            KEYWORD_MAP = {
                'no': 0, 'healthy': 0, 'normal': 0,
                'mild': 1,
                'moderate': 2,
                'severe': 3,
                'proliferative': 4, 'proliferate': 4, 'pdr': 4,
            }
            for subdir in subdirs:
                name_lower = subdir.lower().replace('_', ' ').replace('-', ' ')
                for keyword, idx in KEYWORD_MAP.items():
                    if keyword in name_lower:
                        class_map[subdir] = idx
                        break

        # Strategy 4: fallback — assign alphabetically (last resort)
        if not class_map and subdirs:
            for i, subdir in enumerate(subdirs):
                if i < len(self.CLASS_NAMES):
                    class_map[subdir] = i

        # Collect samples
        for folder_name, class_idx in class_map.items():
            folder_path = os.path.join(self.root_dir, folder_name)
            count = 0
            for fname in os.listdir(folder_path):
                ext = os.path.splitext(fname)[1].lower()
                if ext in self.VALID_EXTENSIONS:
                    self.samples.append((os.path.join(folder_path, fname), class_idx))
                    count += 1
            self.class_counts[self.CLASS_NAMES[class_idx]] = count

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, label

    def get_class_distribution(self):
        """Return dict of class_name → count."""
        return dict(self.class_counts)
