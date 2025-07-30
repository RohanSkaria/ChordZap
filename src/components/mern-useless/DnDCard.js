import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import './favorites.css';

const ItemType = 'MOVIE_CARD';

const DnDCard = ({ movie, id, index, moveCard }) => {
    const ref = useRef(null);

    const [{ handlerId }, drop] = useDrop({
        accept: ItemType,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover: (item, monitor) => {
            if (!ref.current) {
                return;
            }

            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) {
                return;
            }

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            moveCard(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item: () => ({ id, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const opacity = isDragging ? 0.4 : 1;

    drag(drop(ref));

    return (
        <div 
            ref={ref} 
            style={{ 
                opacity, 
                cursor: 'move', 
                position: 'relative', 
                marginBottom: '20px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            data-handler-id={handlerId}
        >
            <div className="favoritesCard">
                <div className={`favoritesNumber ${(index + 1) >= 10 ? 'favoritesNumberTwoDigit' : 'favoritesNumberOneDigit'}`}>
                    {index + 1}
                </div>
                
                <img
                    className="favoritesPoster"
                    src={movie.poster ? `${movie.poster}/150px100` : '/images/NoPosterAvailable-crop.jpg'}
                    alt={movie.title}
                    style={{ marginRight: '20px' }}
                    onError={(e) => {
                        e.target.src = "/images/NoPosterAvailable-crop.jpg";
                    }}
                />
                
                <div className="favoritesTitle">
                    {movie.title}
                </div>
            </div>
        </div>
    );
};
export default DnDCard;