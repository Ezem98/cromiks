import os
import sys

# Permitir importar los módulos planos del paquete (config, imaging, ...).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
