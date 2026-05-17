"use client";

import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Application, ApplicationStatus } from "@/types";
import KanbanColumn from "./KanbanColumn";

interface KanbanBoardProps {
    applications: Application[];
    onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
    onCardClick: (app: Application) => void;
}

const COLUMN_ORDER: ApplicationStatus[] = [
    "REJECTED",
    "WISHLIST",
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "ACCEPTED",
];

export default function KanbanBoard({
    applications,
    onStatusChange,
    onCardClick,
}: KanbanBoardProps) {
    const grouped = COLUMN_ORDER.reduce(
        (acc, status) => {
            acc[status] = applications.filter((app) => app.status === status);
            return acc;
        },
        {} as Record<ApplicationStatus, Application[]>
    );

    const handleDragEnd = (result: DropResult) => {
        const { destination, draggableId } = result;

        if (!destination) return;

        const newStatus = destination.droppableId as ApplicationStatus;
        const app = applications.find((a) => a.id === draggableId);

        if (app && app.status !== newStatus) {
            onStatusChange(draggableId, newStatus);
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 px-1">
                {COLUMN_ORDER.map((status) => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        applications={grouped[status]}
                        onCardClick={onCardClick}
                    />
                ))}
            </div>
        </DragDropContext>
    );
}