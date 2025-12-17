import pandas as pd
import numpy as np
import random

pizzas = {
    'Martian Special': {'Small': 500, 'Large': 850, 'Party': 1200},
    'Venus Veggie Delight': {'Small': 450, 'Large': 800, 'Party': 1150},
    'Jupiter Jumbo': {'Small': 600, 'Large': 950, 'Party': 1300},
    'Saturn Supreme': {'Small': 550, 'Large': 900, 'Party': 1250}
}

pizza_names = list(pizzas.keys())
sizes = ['Small', 'Large', 'Party']

prefixes = ['Neo', 'Stellar', 'Quantum', 'Interstellar', 'Astro', 'Galactic', 'Cosmo', 'Hyper', 'Exo', 'Nebula']
stars = ['Proxima Centauri', 'Vega', 'Sirius', 'Altair', 'Rigel', 'Betelgeuse', 'Andromeda', 'Orion', 'Cygnus', 'Lyra', 'Polaris', 'Arcturus', 'Capella', 'Aldebaran', 'Spica', 'Antares', 'Pollux', 'Deneb', 'Regulus', 'Castor']
suffixes = ['Research Outpost', 'Planetary Colony', 'Space Station', 'Mining Facility', 'Exo-Planet Haven', 'Lunar Base', 'Outpost', 'Research Facility', 'Colony Station', 'Prime Outpost']
labels = ['Zeta', 'Prime', 'Alpha', 'Nova', 'Beta', 'Major', 'Gamma', 'Delta', 'Epsilon', 'Forge', 'Omega', 'Sigma', 'Tau', 'Pi', 'Lambda']

def generate_location():
    prefix = random.choice(prefixes + [''])
    star = random.choice(stars)
    suffix = random.choice(suffixes)
    label = random.choice(labels)
    parts = [p for p in [prefix, star, suffix, label] if p]
    return ' '.join(parts)

num_rows = 3000
locations = [generate_location() for _ in range(num_rows)]

data = {
    'Location': locations,
    'Pizza_Type': [random.choice(pizza_names) for _ in range(num_rows)],
    'Size': [random.choice(sizes) for _ in range(num_rows)],
    'Orders_Delivered': np.random.randint(5, 500, num_rows),
    'Average_Delivery_Time_Minutes': np.random.randint(10, 120, num_rows),
    'Distance_From_HQ_LightYears': np.round(np.random.uniform(0.1, 1000, num_rows), 2),
    'Customer_Satisfaction_Percent': np.round(np.random.uniform(60, 100, num_rows), 1),
    'Delivery_Failures': np.random.randint(0, 20, num_rows),
    'Peak_Delivery_Hour': np.random.randint(0, 24, num_rows),
}

df = pd.DataFrame(data)
df['Price'] = df.apply(lambda row: pizzas[row['Pizza_Type']][row['Size']], axis=1)
df['Total_Revenue'] = df['Orders_Delivered'] * df['Price']

columns = ['Location', 'Pizza_Type', 'Size', 'Price', 'Orders_Delivered', 'Total_Revenue',
           'Average_Delivery_Time_Minutes', 'Distance_From_HQ_LightYears',
           'Customer_Satisfaction_Percent', 'Delivery_Failures', 'Peak_Delivery_Hour']
df = df[columns]

df.to_excel('galaxy_pizza_deliveries.xlsx', index=False)