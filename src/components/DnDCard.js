import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Card } from 'react-bootstrap';

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
            style={{ opacity, cursor: 'move', position: 'relative', marginBottom: '15px' }}
            data-handler-id={handlerId}
        >
            <Card className="favoritesCard">
                <div className={`favoritesNumber ${(index + 1) >= 10 ? 'favoritesNumberTwoDigit' : 'favoritesNumberOneDigit'}`}>
                    <div style={{ paddingTop: (index + 1) >= 10 ? '10px' : '0px' }}>
                        {index + 1}
                    </div>
                </div>
                
                <Card.Img
                    className="favoritesPoster"
                    src={movie.poster ? `${movie.poster}/150px100` : '/images/placeholder-poster.png'}
                    alt={movie.title}
                />
                
                <Card.Body style={{ flex: 1 }}>
                    <div className="favoritesTitle">
                        {movie.title}
                    </div>
                    <Card.Text style={{ fontSize: '0.8em', marginTop: '10px' }}>
                        <strong>Rating:</strong> {movie.rated || 'Not Rated'}
                    </Card.Text>
                    <Card.Text style={{ fontSize: '0.7em' }}>
                        {movie.plot ? (movie.plot.length > 150 ? movie.plot.substring(0, 150) + '...' : movie.plot) : 'No plot available'}
                    </Card.Text>
                </Card.Body>
            </Card>
        </div>
    );
};

export default DnDCard;