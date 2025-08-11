import pandas as pd
import numpy as np

df = pd.read_csv('./static/puzzles.csv')

# Rating bands
bins = [0, 1000, 1200, 1400, 1500, 1600, 1800, 2000, 2200, 2400, 3000]
labels = ['<1000', '1000-1200', '1200-1400', '1400-1500', '1500-1600', 
          '1600-1800', '1800-2000', '2000-2200', '2200-2400', '2400+']

df['rating_band'] = pd.cut(df['Rating'], bins=bins, labels=labels)

# Stats
stats = df.groupby('rating_band', observed=True).agg(
    count=('Rating', 'count'),
    mean_rating=('Rating', 'mean'),
    std_rating=('Rating', 'std'),
    nm_plays=('NbPlays', 'count')
).round(0)

stats['percentage'] = (stats['count'] / len(df) * 100).round(2)

print(stats)
print(f"\nTotal puzzles: {len(df)}")
print(f"Mean rating: {df['Rating'].mean():.0f}")
print(f"Median rating: {df['Rating'].median():.0f}")
print(f"Total plays: {df['NbPlays'].sum():.0f}")